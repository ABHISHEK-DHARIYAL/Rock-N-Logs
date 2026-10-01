/**
 * PrismaMenuRepository
 *
 * Concrete MenuRepository implementation backed by Prisma/PostgreSQL.
 * Owns all menu-related SQL/query shape decisions so MenuService never
 * needs to know Prisma exists.
 */
import type { PrismaClient } from "@prisma/client";
import type {
  MenuRepository,
  MenuCategoryWithItems,
  MenuItemWithImage,
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from "../interfaces/MenuRepository";

export class PrismaMenuRepository implements MenuRepository {
  constructor(private readonly db: PrismaClient) {}

  async listCategoriesWithItems(): Promise<MenuCategoryWithItems[]> {
    return this.db.menuCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: { image: true },
        },
      },
    });
  }

  async findCategoryById(id: string) {
    return this.db.menuCategory.findUnique({ where: { id } });
  }

  async createCategory(name: string, sortOrder = 0) {
    return this.db.menuCategory.create({ data: { name, sortOrder } });
  }

  async findItemById(id: string): Promise<MenuItemWithImage | null> {
    return this.db.menuItem.findUnique({ where: { id }, include: { image: true } });
  }

  async createItem(input: CreateMenuItemInput): Promise<MenuItemWithImage> {
    return this.db.menuItem.create({
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        categoryId: input.categoryId,
        isAvailable: input.isAvailable ?? true,
        isFeatured: input.isFeatured ?? false,
        sortOrder: input.sortOrder ?? 0,
        imageId: input.imageId ?? null,
      },
      include: { image: true },
    });
  }

  async updateItem(id: string, input: UpdateMenuItemInput): Promise<MenuItemWithImage> {
    return this.db.menuItem.update({
      where: { id },
      data: input,
      include: { image: true },
    });
  }

  async deleteItem(id: string): Promise<void> {
    await this.db.menuItem.delete({ where: { id } });
  }
}
