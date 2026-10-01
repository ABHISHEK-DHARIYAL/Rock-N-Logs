/**
 * Menu Service
 *
 * Business operation: managing the restaurant's menu (categories and
 * items). Validates input and enforces menu-specific rules before
 * delegating persistence to MenuRepository. UI and API routes never
 * construct Prisma queries themselves.
 */
import { NotFoundError, ValidationError } from "../../domain/errors";
import type {
  MenuRepository,
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from "../../repositories/interfaces/MenuRepository";

export class MenuService {
  constructor(private readonly menu: MenuRepository) {}

  async getFullMenu() {
    return this.menu.listCategoriesWithItems();
  }

  async createCategory(name: string, sortOrder?: number) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ValidationError("Category name is required.");
    }
    return this.menu.createCategory(trimmed, sortOrder);
  }

  async createItem(input: CreateMenuItemInput) {
    this.validateItemInput(input);

    const category = await this.menu.findCategoryById(input.categoryId);
    if (!category) {
      throw new NotFoundError("MenuCategory", input.categoryId);
    }

    return this.menu.createItem({
      ...input,
      name: input.name.trim(),
      description: input.description.trim(),
    });
  }

  async updateItem(id: string, input: UpdateMenuItemInput) {
    const existing = await this.menu.findItemById(id);
    if (!existing) {
      throw new NotFoundError("MenuItem", id);
    }

    if (input.price !== undefined && input.price < 0) {
      throw new ValidationError("Price cannot be negative.");
    }
    if (input.categoryId) {
      const category = await this.menu.findCategoryById(input.categoryId);
      if (!category) {
        throw new NotFoundError("MenuCategory", input.categoryId);
      }
    }

    return this.menu.updateItem(id, input);
  }

  async deleteItem(id: string) {
    const existing = await this.menu.findItemById(id);
    if (!existing) {
      throw new NotFoundError("MenuItem", id);
    }
    await this.menu.deleteItem(id);
  }

  private validateItemInput(input: CreateMenuItemInput) {
    if (!input.name?.trim()) {
      throw new ValidationError("Item name is required.");
    }
    if (!input.description?.trim()) {
      throw new ValidationError("Item description is required.");
    }
    if (typeof input.price !== "number" || input.price < 0) {
      throw new ValidationError("Price must be a non-negative number.");
    }
    if (!input.categoryId) {
      throw new ValidationError("A category is required.");
    }
  }
}
