import { getDb } from '../db';
import { Category, Subcategory } from '../../types';
import { getCurrentISOString } from '../../utils/date';

export class CategoryRepository {
  static async getAll(type?: 'income' | 'expense'): Promise<Category[]> {
    const db = getDb();
    let query = 'SELECT * FROM categories WHERE is_active = 1';
    const params: any[] = [];
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    query += ' ORDER BY is_default DESC, name ASC;';

    return await db.getAllAsync<Category>(query, params);
  }

  static async getById(id: string): Promise<Category | null> {
    const db = getDb();
    const result = await db.getFirstAsync<Category>(
      'SELECT * FROM categories WHERE id = ?;',
      [id]
    );
    return result || null;
  }

  static async create(
    cat: Omit<Category, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Category> {
    const db = getDb();
    const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = getCurrentISOString();

    await db.runAsync(
      `INSERT INTO categories (id, name, name_bn, type, icon, color, is_default, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        cat.name,
        cat.name_bn || null,
        cat.type,
        cat.icon,
        cat.color,
        cat.is_default ?? 0,
        cat.is_active ?? 1,
        now,
        now,
      ]
    );

    return (await this.getById(id))!;
  }

  static async update(
    id: string,
    updates: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Category | null> {
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = getCurrentISOString();
    const name = updates.name ?? existing.name;
    const name_bn = updates.name_bn !== undefined ? updates.name_bn : existing.name_bn;
    const icon = updates.icon ?? existing.icon;
    const color = updates.color ?? existing.color;
    const is_active = updates.is_active ?? existing.is_active;

    await db.runAsync(
      `UPDATE categories SET name = ?, name_bn = ?, icon = ?, color = ?, is_active = ?, updated_at = ? WHERE id = ?;`,
      [name, name_bn || null, icon, color, is_active, now, id]
    );

    return await this.getById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const db = getDb();
    // Check if transactions exist
    const txCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?;',
      [id]
    );

    if (txCount && txCount.count > 0) {
      await db.runAsync('UPDATE categories SET is_active = 0 WHERE id = ?;', [id]);
      return true;
    }

    await db.runAsync('DELETE FROM categories WHERE id = ?;', [id]);
    return true;
  }

  static async getSubcategories(categoryId: string): Promise<Subcategory[]> {
    const db = getDb();
    return await db.getAllAsync<Subcategory>(
      'SELECT * FROM subcategories WHERE category_id = ? ORDER BY name ASC;',
      [categoryId]
    );
  }

  static async createSubcategory(
    categoryId: string,
    name: string,
    name_bn?: string
  ): Promise<Subcategory> {
    const db = getDb();
    const id = `subcat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = getCurrentISOString();

    await db.runAsync(
      `INSERT INTO subcategories (id, category_id, name, name_bn, created_at) VALUES (?, ?, ?, ?, ?);`,
      [id, categoryId, name, name_bn || null, now]
    );

    return (await db.getFirstAsync<Subcategory>(
      'SELECT * FROM subcategories WHERE id = ?;',
      [id]
    ))!;
  }
}

