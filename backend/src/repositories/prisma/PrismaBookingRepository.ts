/**
 * PrismaBookingRepository
 *
 * Concrete BookingRepository implementation backed by Prisma/PostgreSQL.
 */
import type { PrismaClient, BookingStatus } from "@prisma/client";
import type {
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
        specialRequest: input.specialRequest ?? null,
        preOrderItems: input.preOrderItems
          ? {
              create: input.preOrderItems.map((item) => ({
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
}
