/** Shapes of the JSON returned by the backend API (dates/decimals arrive as strings). */
export interface Image { id: string; url: string; altText: string | null; width: number | null; height: number | null; createdAt: string }
export interface MenuItemWithImage {
  id: string; name: string; description: string; price: string | number;
  isAvailable: boolean; isFeatured: boolean; sortOrder: number;
  categoryId: string; imageId: string | null; image: Image | null;
}
export interface MenuCategoryWithItems { id: string; name: string; sortOrder: number; items: MenuItemWithImage[] }
export interface PromotionWithImage {
  id: string; title: string; description: string; isActive: boolean;
  startsAt: string | null; endsAt: string | null; image: Image | null;
}
export interface GalleryPhotoWithImage { id: string; caption: string | null; sortOrder: number; image: Image }
export interface RestaurantSettings {
  name: string; tagline: string | null; description: string | null; address: string | null;
  phone: string | null; whatsappPhone: string | null; email: string | null; openingHours: string | null;
}
export interface MenuDocument { url: string | null; originalFilename: string | null; fileSizeBytes: number | null }
export interface Booking {
  id: string; customerName: string; customerPhone: string; partySize: number;
  requestedDate: string; status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
}
