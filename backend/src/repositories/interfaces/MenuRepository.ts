/**
 * MenuRepository (interface)
 *
 * Data-access contract for menu categories and items. MenuService depends
 * on this interface, not on Prisma directly (Dependency Inversion), so the
 * persistence technology can change without touching business logic, and
 * unit tests can supply an in-memory fake.
 */
import type { MenuCategory, MenuItem, Image } from "@prisma/client";

export type MenuItemWithImage = MenuItem & { image: Image | null };
export type MenuCategoryWithItems = MenuCategory & { items: MenuItemWithImage[] };

export interface CreateMenuItemInput {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  imageId?: string | null;
}

export type UpdateMenuItemInput = Partial<CreateMenuItemInput>;

export interface MenuRepository {
  listCategoriesWithItems(): Promise<MenuCategoryWithItems[]>;
  findCategoryById(id: string): Promise<MenuCategory | null>;
  createCategory(name: string, sortOrder?: number): Promise<MenuCategory>;

  findItemById(id: string): Promise<MenuItemWithImage | null>;
  createItem(input: CreateMenuItemInput): Promise<MenuItemWithImage>;
  updateItem(id: string, input: UpdateMenuItemInput): Promise<MenuItemWithImage>;
  deleteItem(id: string): Promise<void>;
}
