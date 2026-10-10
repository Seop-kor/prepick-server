import {
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

@InputType()
export class OrderItemInput {
  @Field(() => ID)
  @IsString()
  productId!: string;

  @Field(() => ID)
  @IsString()
  skuId!: string;

  @Field()
  @IsString()
  @Length(1, 100)
  productName!: string;

  @Field()
  @IsString()
  @Length(1, 100)
  skuName!: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  price!: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

@InputType()
export class CreateOrderInput {
  @Field()
  @IsString()
  @Length(1, 64)
  cartId!: string;

  @Field(() => ID)
  @IsString()
  storeId!: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  amount!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  request?: string | null;

  @Field(() => GraphQLISODateTime)
  @IsDate()
  paidAt!: Date;

  @Field(() => [OrderItemInput])
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items!: OrderItemInput[];
}

@ObjectType('OrderItem')
export class OrderItemType {
  @Field(() => ID)
  id!: number;

  @Field(() => ID)
  productId!: number;

  @Field(() => ID)
  skuId!: number;

  @Field()
  productName!: string;

  @Field()
  skuName!: string;

  @Field(() => Int)
  price!: number;

  @Field(() => Int)
  quantity!: number;
}

@ObjectType('Order')
export class OrderType {
  @Field(() => ID)
  id!: number;

  @Field(() => ID)
  storeId!: number;

  @Field()
  storeName!: string;

  @Field()
  prefixOrderNumber!: string;

  @Field(() => Int)
  orderNumber!: number;

  @Field(() => Int)
  amount!: number;

  @Field(() => String, { nullable: true })
  request!: string | null;

  @Field(() => [OrderItemType])
  items!: OrderItemType[];

  @Field(() => GraphQLISODateTime)
  paidAt!: Date;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}

@ObjectType()
export class OrderPage {
  @Field(() => [OrderType])
  items!: OrderType[];

  @Field(() => String, { nullable: true })
  nextCursor!: string | null;
}
