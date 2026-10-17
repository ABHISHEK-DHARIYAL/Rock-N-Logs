/**
 * PrismaBookingRepository
 *
 * Concrete BookingRepository implementation backed by Prisma/PostgreSQL.
 */
import type { PrismaClient, BookingStatus } from "@prisma/client";
import type {
  AddPreOrderItemInput,
  BookingRepository,
  BookingWithPreOrders,
  CreateBookingInput,
} from "../interfaces/BookingRepository";

export class PrismaBookingRepository implements BookingRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: CreateBookingInput): Promise<BookingWithPreOrders> {
    return this.db.booking.create({
      data: {
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail ?? null,
        partySize: input.partySize,
        requestedDate: input.requestedDate,
        requestedLocal: input.requestedLocal ?? null,
        specialRequest: input.specialRequest ?? null,
        receiptTokenHash: input.receiptTokenHash,
        preOrderItems: input.preOrderItems
          ? {
              create: input.preOrderItems.map((item) => ({
                menuItemId: item.menuItemId,
                menuItemName: item.menuItemName,
                quantity: item.quantity,
                priceAtOrder: item.priceAtOrder,
              })),
            }
          : undefined,
      },
      include: { preOrderItems: true },
    });
  }

  async findById(id: string): Promise<BookingWithPreOrders | null> {
    return this.db.booking.findUnique({
      where: { id },
      include: { preOrderItems: true },
    });
  }

  async findByReceiptTokenHash(hash: string): Promise<BookingWithPreOrders | null> {
    return this.db.booking.findUnique({
      where: { receiptTokenHash: hash },
      include: { preOrderItems: true },
    });
  }

  async list(filter?: { status?: BookingStatus }): Promise<BookingWithPreOrders[]> {
    return this.db.booking.findMany({
      where: filter?.status ? { status: filter.status } : undefined,
      orderBy: { requestedDate: "asc" },
      include: { preOrderItems: true },
    });
  }

  async updateStatus(id: string, status: BookingStatus): Promise<BookingWithPreOrders> {
    return this.db.booking.update({
      where: { id },
      data: { status },
      include: { preOrderItems: true },
    });
  }

  async addPreOrderItems(bookingId: string, items: AddPreOrderItemInput[]): Promise<BookingWithPreOrders> {
    return this.db.$transaction(async (tx) => {
      for (const item of items) {
        const existing = await tx.bookingPreOrderItem.findFirst({
          where: { bookingId, menuItemId: item.menuItemId, priceAtOrder: item.priceAtOrder },
        });
        if (existing) {
          await tx.bookingPreOrderItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + item.quantity },
          });
        } else {
          await tx.bookingPreOrderItem.create({
            data: {
              bookingId,
              menuItemId: item.menuItemId,
              menuItemName: item.menuItemName,
              quantity: item.quantity,
              priceAtOrder: item.priceAtOrder,
            },
          });
        }
      }
      return tx.booking.update({
        where: { id: bookingId },
        data: { updatedAt: new Date() },
        include: { preOrderItems: true },
      });
    });
  }
}
