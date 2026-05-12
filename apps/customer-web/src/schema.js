import { z } from "zod";

const StickerStateSchema = z.object({
  owned: z.number(),
  forSwap: z.boolean().optional(),
}).passthrough();

const AlbumGroupSchema = z.record(z.string(), StickerStateSchema);

const UserSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  memberSince: z.string().optional(),
  referralCode: z.string().optional(),
  avatar: z.string().optional(),
  username: z.string().optional(),
}).passthrough();

const OrderSchema = z.object({
  orderNumber: z.string(),
  date: z.string(),
  items: z.array(z.object({ id: z.string(), qty: z.number() }).passthrough()),
  total: z.number(),
  status: z.string(),
  delivery: z.string(),
}).passthrough();

const UISchema = z.object({
  tab: z.string().optional(),
  albumSub: z.string().optional(),
  albumQuery: z.string().optional(),
  albumFilter: z.string().optional(),
  tiendaCat: z.string().optional(),
  tiendaQ: z.string().optional(),
  payMethod: z.string().optional(),
  delivery: z.string().optional(),
  editingProfile: z.boolean().optional(),
  modal: z.string().nullable().optional(),
  modalData: z.record(z.string(), z.unknown()).optional(),
  theme: z.enum(["auto","light","dark"]).optional(),
}).passthrough();

const MyPaniniSchema = z.object({
  step: z.number(),
  cardType: z.string().nullable().optional(),
  country: z.unknown().optional(),
  countryQuery: z.string().optional(),
  countryOpen: z.boolean().optional(),
  originalPhoto: z.string().nullable().optional(),
  processedPhoto: z.string().nullable().optional(),
  bgRemovalLoading: z.boolean().optional(),
  bgRemovalError: z.string().nullable().optional(),
  bgProgress: z.number().optional(),
  bgProgressKey: z.string().optional(),
  photoOffsetY: z.number().optional(),
  fields: z.object({}).passthrough().optional(),
  uploadError: z.string().nullable().optional(),
  backgroundRemoved: z.boolean().optional(),
}).passthrough();

const HistoryItemSchema = z.object({
  screen: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const PendingOrderSchema = z.object({
  orderNumber: z.string(),
  preferenceId: z.string().optional(),
  total: z.number(),
  items: z.array(z.object({ id: z.string(), qty: z.number(), name: z.string().optional(), price: z.number().optional() }).passthrough()),
  delivery: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const StateSchema = z.object({
  screen: z.string(),
  params: z.record(z.string(), z.unknown()),
  cart: z.record(z.string(), z.number()),
  album: z.record(z.string(), AlbumGroupSchema),
  user: UserSchema,
  orders: z.array(OrderSchema),
  lastCodes: z.array(z.string()),
  ui: UISchema,
  history: z.array(HistoryItemSchema).optional(),
  myPanini: MyPaniniSchema,
  pendingOrder: PendingOrderSchema.nullable().optional(),
}).passthrough();

export const CheckoutPayloadSchema = z.object({
  items: z.array(z.object({
    title: z.string().min(1),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
  })).min(1),
  user: z.object({
    name: z.string().min(1),
    phone: z.string().min(6, "Falta teléfono válido"),
    email: z.string().email().optional(),
    address: z.string().min(3, "Falta dirección"),
    city: z.string().optional(),
    addressDetails: z.object({
      lat: z.number(),
      lng: z.number(),
      formatted: z.string().optional(),
      street_number: z.string().optional(),
      route: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
    addressForm: z.object({
      estado: z.string().optional(),
      municipio: z.string().optional(),
      localidad: z.string().optional(),
      colonia: z.string().optional(),
      cp: z.string().optional(),
      cp_unknown: z.boolean().optional(),
      sin_numero: z.boolean().optional(),
      numero_interior: z.string().optional(),
    }).optional(),
  }),
  delivery: z.enum(["pickup","gdl","nacional"]).optional(),
  referralCode: z.string().min(2).max(24).optional(),
});
