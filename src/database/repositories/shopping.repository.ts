import { getDb } from '../db';
import { ShoppingList, ShoppingItem, Transaction } from '../../types';
import { getCurrentISOString, getTodayDateString, getCurrentTimeString } from '../../utils/date';
import { TransactionRepository } from './transaction.repository';

export class ShoppingRepository {
  static async getAll(status?: 'active' | 'completed'): Promise<ShoppingList[]> {
    const db = getDb();
    let query = `
      SELECT l.*, a.name as account_name, c.name as category_name,
        (SELECT COUNT(*) FROM shopping_items WHERE list_id = l.id) as items_count,
        (SELECT COUNT(*) FROM shopping_items WHERE list_id = l.id AND is_purchased = 1) as purchased_count
      FROM shopping_lists l
      LEFT JOIN accounts a ON l.account_id = a.id
      LEFT JOIN categories c ON l.category_id = c.id
    `;
    const params: any[] = [];
    if (status) {
      query += ' WHERE l.status = ?';
      params.push(status);
    }
    query += ' ORDER BY l.target_date DESC, l.created_at DESC;';

    return await db.getAllAsync<ShoppingList>(query, params);
  }

  static async getById(id: string): Promise<ShoppingList | null> {
    const db = getDb();
    const list = await db.getFirstAsync<ShoppingList>(
      `SELECT l.*, a.name as account_name, c.name as category_name,
        (SELECT COUNT(*) FROM shopping_items WHERE list_id = l.id) as items_count,
        (SELECT COUNT(*) FROM shopping_items WHERE list_id = l.id AND is_purchased = 1) as purchased_count
       FROM shopping_lists l
       LEFT JOIN accounts a ON l.account_id = a.id
       LEFT JOIN categories c ON l.category_id = c.id
       WHERE l.id = ?;`,
      [id]
    );

    if (!list) return null;

    const items = await db.getAllAsync<ShoppingItem>(
      `SELECT * FROM shopping_items WHERE list_id = ? ORDER BY is_purchased ASC, created_at ASC;`,
      [id]
    );

    return { ...list, items };
  }

  static async create(
    list: Omit<ShoppingList, 'id' | 'total_spent' | 'created_at' | 'updated_at'>,
    initialItems?: Array<{ item_name: string; quantity?: string; estimated_amount?: number }>
  ): Promise<ShoppingList> {
    const db = getDb();
    const id = `shop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = getCurrentISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO shopping_lists (
          id, title, budget_amount, total_spent, account_id, category_id,
          target_date, status, transaction_id, notes, created_at, updated_at
        ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, null, ?, ?, ?);`,
        [
          id,
          list.title,
          list.budget_amount || 0,
          list.account_id || null,
          list.category_id || null,
          list.target_date,
          list.status || 'active',
          list.notes || null,
          now,
          now,
        ]
      );

      if (initialItems && initialItems.length > 0) {
        for (const item of initialItems) {
          const itemId = `sitem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await db.runAsync(
            `INSERT INTO shopping_items (
              id, list_id, item_name, quantity, estimated_amount, actual_amount,
              is_purchased, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?);`,
            [
              itemId,
              id,
              item.item_name,
              item.quantity || null,
              item.estimated_amount || 0,
              now,
              now,
            ]
          );
        }
      }
    });

    return (await this.getById(id))!;
  }

  static async update(id: string, updates: Partial<ShoppingList>): Promise<boolean> {
    const db = getDb();
    const now = getCurrentISOString();

    const fields: string[] = [];
    const params: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      params.push(updates.title);
    }
    if (updates.budget_amount !== undefined) {
      fields.push('budget_amount = ?');
      params.push(updates.budget_amount);
    }
    if (updates.account_id !== undefined) {
      fields.push('account_id = ?');
      params.push(updates.account_id);
    }
    if (updates.category_id !== undefined) {
      fields.push('category_id = ?');
      params.push(updates.category_id);
    }
    if (updates.target_date !== undefined) {
      fields.push('target_date = ?');
      params.push(updates.target_date);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      params.push(updates.notes);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await db.runAsync(`UPDATE shopping_lists SET ${fields.join(', ')} WHERE id = ?;`, params);
    return true;
  }

  static async delete(id: string): Promise<boolean> {
    const db = getDb();
    await db.runAsync('DELETE FROM shopping_lists WHERE id = ?;', [id]);
    return true;
  }

  static async addItem(
    listId: string,
    item: { item_name: string; quantity?: string; estimated_amount?: number; actual_amount?: number }
  ): Promise<ShoppingItem> {
    const db = getDb();
    const itemId = `sitem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = getCurrentISOString();

    await db.runAsync(
      `INSERT INTO shopping_items (
        id, list_id, item_name, quantity, estimated_amount, actual_amount,
        is_purchased, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?);`,
      [
        itemId,
        listId,
        item.item_name,
        item.quantity || null,
        item.estimated_amount || 0,
        item.actual_amount || 0,
        now,
        now,
      ]
    );

    await this.recalculateListTotal(listId);

    return (await db.getFirstAsync<ShoppingItem>(
      'SELECT * FROM shopping_items WHERE id = ?;',
      [itemId]
    ))!;
  }

  static async toggleItemPurchased(
    itemId: string,
    isPurchased: boolean,
    actualAmount?: number
  ): Promise<boolean> {
    const db = getDb();
    const item = await db.getFirstAsync<ShoppingItem>('SELECT * FROM shopping_items WHERE id = ?;', [itemId]);
    if (!item) return false;

    const now = getCurrentISOString();
    const newPurchased = isPurchased ? 1 : 0;
    // If marking purchased and actualAmount is provided, set it; otherwise use estimated or existing actual
    let finalActual = item.actual_amount;
    if (isPurchased) {
      if (actualAmount !== undefined && actualAmount > 0) {
        finalActual = actualAmount;
      } else if (item.actual_amount === 0 && item.estimated_amount > 0) {
        finalActual = item.estimated_amount;
      }
    }

    await db.runAsync(
      `UPDATE shopping_items SET is_purchased = ?, actual_amount = ?, updated_at = ? WHERE id = ?;`,
      [newPurchased, finalActual, now, itemId]
    );

    await this.recalculateListTotal(item.list_id);
    return true;
  }

  static async updateItem(itemId: string, updates: Partial<ShoppingItem>): Promise<boolean> {
    const db = getDb();
    const item = await db.getFirstAsync<ShoppingItem>('SELECT * FROM shopping_items WHERE id = ?;', [itemId]);
    if (!item) return false;

    const now = getCurrentISOString();
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.item_name !== undefined) {
      fields.push('item_name = ?');
      params.push(updates.item_name);
    }
    if (updates.quantity !== undefined) {
      fields.push('quantity = ?');
      params.push(updates.quantity);
    }
    if (updates.estimated_amount !== undefined) {
      fields.push('estimated_amount = ?');
      params.push(updates.estimated_amount);
    }
    if (updates.actual_amount !== undefined) {
      fields.push('actual_amount = ?');
      params.push(updates.actual_amount);
    }
    if (updates.is_purchased !== undefined) {
      fields.push('is_purchased = ?');
      params.push(updates.is_purchased);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = ?');
    params.push(now);
    params.push(itemId);

    await db.runAsync(`UPDATE shopping_items SET ${fields.join(', ')} WHERE id = ?;`, params);
    await this.recalculateListTotal(item.list_id);
    return true;
  }

  static async deleteItem(itemId: string): Promise<boolean> {
    const db = getDb();
    const item = await db.getFirstAsync<ShoppingItem>('SELECT list_id FROM shopping_items WHERE id = ?;', [itemId]);
    if (!item) return false;

    await db.runAsync('DELETE FROM shopping_items WHERE id = ?;', [itemId]);
    await this.recalculateListTotal(item.list_id);
    return true;
  }

  /**
   * Recalculates and updates the total_spent on a shopping list based on checked items.
   */
  static async recalculateListTotal(listId: string): Promise<number> {
    const db = getDb();
    const result = await db.getFirstAsync<{ total: number }>(
      `SELECT SUM(actual_amount) as total FROM shopping_items WHERE list_id = ? AND is_purchased = 1;`,
      [listId]
    );

    const totalSpent = result?.total || 0;
    const now = getCurrentISOString();

    await db.runAsync(
      `UPDATE shopping_lists SET total_spent = ?, updated_at = ? WHERE id = ?;`,
      [totalSpent, now, listId]
    );

    return totalSpent;
  }

  /**
   * Converts the shopping list into an actual Expense Transaction in the user's account wallet!
   */
  static async convertListToExpense(
    listId: string,
    accountId: string,
    categoryId?: string
  ): Promise<Transaction> {
    const db = getDb();
    const list = await this.getById(listId);
    if (!list) throw new Error('Shopping list not found');

    const totalSpent = await this.recalculateListTotal(listId);
    if (totalSpent <= 0) {
      throw new Error('Total shopping expense must be greater than zero. Please check purchased items with prices.');
    }

    const today = getTodayDateString();
    const time = getCurrentTimeString();
    const now = getCurrentISOString();

    // Compile items summary for the transaction notes
    const purchasedItems = (list.items || []).filter((i) => i.is_purchased === 1);
    const itemsSummary = purchasedItems
      .map((i) => `${i.item_name}${i.quantity ? ` (${i.quantity})` : ''}`)
      .join(', ');

    let createdTx: Transaction;

    await db.withTransactionAsync(async () => {
      // 1. Create the actual Expense transaction
      createdTx = await TransactionRepository.create({
        type: 'expense',
        account_id: accountId,
        category_id: categoryId || list.category_id || null,
        amount: totalSpent,
        date: today,
        time,
        title: `বাজার খরচ: ${list.title}`,
        notes: itemsSummary ? `কেনাকাটার তালিকা: ${itemsSummary}` : 'বাজার ফর্দ থেকে স্বয়ংক্রিয়ভাবে খরচ যুক্ত করা হয়েছে',
      });

      // 2. Mark list as completed & link transaction ID
      await db.runAsync(
        `UPDATE shopping_lists
         SET status = 'completed', transaction_id = ?, updated_at = ?
         WHERE id = ?;`,
        [createdTx.id, now, listId]
      );
    });

    return createdTx!;
  }
}

