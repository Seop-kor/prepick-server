export class Sku {
  id!: number;
  productId!: number;
  name!: string;
  price!: number;
  isActive = true;
  isSoldOut = false;
}
