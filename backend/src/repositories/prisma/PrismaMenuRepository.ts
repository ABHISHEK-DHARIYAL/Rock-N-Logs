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
    // createdAt is the tiebreaker: items that share a sortOrder (e.g. all the 0s created before
    // ordering existed) must still come back in a stable, predictable order.
    return this.db.menuCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
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

  async findItemsByIds(ids: string[]): Promise<MenuItemWithImage[]> {
    return this.db.menuItem.findMany({ where: { id: { in: ids } }, include: { image: true } });
  }

  async createItem(input: CreateMenuItemInput): Promise<MenuItemWithImage> {
    // New dishes go to the end of their category unless an explicit position is given.
    let sortOrder = input.sortOrder;
    if (sortOrder === undefined) {
      const last = await this.db.menuItem.aggregate({
        where: { categoryId: input.categoryId },
        _max: { sortOrder: true },
      });
      sortOrder = (last._max.sortOrder ?? -1) + 1;
    }
    return this.db.menuItem.create({
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        categoryId: input.categoryId,
        isAvailable: input.isAvailable ?? true,
        isFeatured: input.isFeatured ?? false,
        sortOrder,
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

  async setItemOrder(orderedIds: string[]): Promise<void> {
    await this.db.$transaction(
      orderedIds.map((id, index) => this.db.menuItem.update({ where: { id }, data: { sortOrder: index } }))
    );
  }
}
