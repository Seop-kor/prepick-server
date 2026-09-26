# Consumer 매장 상품(메뉴) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매장의 카테고리·상품·SKU 목록(`storeProducts`)과 상품 상세(`product`)를 GraphQL로 조회한다.

**Architecture:** 먼저 동작 변경 없이 `discovery.*` 파일 이름을 `stores.*`로 바꾸고, `validateId`를 `src/common/validation.ts`로, 상품·SKU 매핑을 새 `src/products/` 모듈로 옮긴다. 그다음 `ProductsService`가 raw SQL 세 번(매장 확인, 상품·SKU JOIN, 카테고리 연결)으로 응답을 만들고 `ProductsResolver`가 두 쿼리를 노출한다.

**Tech Stack:** NestJS 11, `@nestjs/graphql` code-first(Apollo), MikroORM 7 `EntityManager.execute`, PostgreSQL, Jest + ts-jest.

**Spec:** `docs/superpowers/specs/2026-09-26-consumer-store-products-design.md`

## Global Constraints

- 테스트 이름은 `~하면 ~한다` 형식으로 쓴다.
- ID는 양의 32비트 정수(`1`~`2147483647`)이며 GraphQL에서는 `ID` 문자열로 받는다. 잘못된 값은 `BadRequestException('Invalid id')`.
- 애플리케이션은 DDL·seed를 실행하지 않고, 저장소에 SQL·seed 파일을 추가하지 않는다. 샘플 SQL은 구현 결과 메시지로만 제공한다.
- 외래 키는 추가하지 않는다. `category`, `product_category`에는 엔티티를 만들지 않는다.
- 조회는 raw SQL(`em.execute`)이며 N+1 조회를 만들지 않는다.
- 기존 spec·plan 문서의 `discovery` 표기는 수정하지 않는다.
- 코드를 수정한 뒤 `graphify update .`를 실행한다.
- 명령은 저장소 루트(`/Users/seop/Workspace/prepick-server`)에서 `yarn`으로 실행한다.

## Review Focus

- 활성 매장에 노출할 상품이 하나도 없으면 `null`이 아니라 빈 `categories`, `products`를 반환해야 한다 — Task 3 테스트.
- 한 상품이 여러 카테고리에 속해도 `products`에는 한 번만 나와야 한다 — Task 3 테스트.
- 카테고리가 다른 매장 상품이나 숨겨진 상품에 연결돼 있으면 그 ID는 빠지고, 남는 상품이 없으면 카테고리도 빠져야 한다 — Task 3 테스트.
- 상품이 활성이어도 매장이 비활성이면 `product(id)`는 `null`이어야 한다. SQL이 `store`를 활성 조건으로 JOIN하는지 Task 3 테스트가 확인한다.
- 잘못된 ID는 DB를 조회하기 전에 입력 오류로 끝나야 한다 — Task 3 테스트.

---

## File Structure

```text
src/common/validation.ts            (신규) isValidId, validateId
src/stores/stores.util.ts           (이름 변경: discovery.pagination.ts) 좌표·반경·페이지·검색어 검증, 커서
src/stores/stores.types.ts          (이름 변경: discovery.types.ts) StorePage, SearchResult, MenuSearch*
src/stores/stores.module.ts         forFeature([StoreSchema])만 남김
src/products/product.entity.ts      (이동) + description, imageUrl
src/products/product.schema.ts      (이동) + description, image_url
src/products/sku.entity.ts          (이동) + isSoldOut
src/products/sku.schema.ts          (이동) + is_sold_out
src/products/products.types.ts      (신규) StoreProducts, Category, ProductType('Product'), SkuType('Sku')
src/products/products.service.ts    (신규) storeProducts, product
src/products/products.resolver.ts   (신규) Query.storeProducts, Query.product
src/products/products.module.ts     (신규) forFeature([ProductSchema, SkuSchema]) + service/resolver
src/app.module.ts                   ProductsModule 등록
test/common/validation.spec.ts      (신규)
test/stores/stores.util.spec.ts     (이름 변경: discovery.pagination.spec.ts)
test/stores/stores.graphql.spec.ts  (이름 변경: discovery.graphql.spec.ts)
test/products/products.service.spec.ts   (신규)
test/products/products.resolver.spec.ts  (신규)
test/products/products.graphql.spec.ts   (신규)
test/app.module.spec.ts             ProductsModule mock 추가
schema.gql                          재생성
```

---

### Task 1: discovery 파일 이름 변경과 validateId 이동

동작 변경 없는 리팩터다.

**Files:**
- Create: `src/common/validation.ts`, `test/common/validation.spec.ts`
- Rename: `src/stores/discovery.pagination.ts` → `src/stores/stores.util.ts`
- Rename: `src/stores/discovery.types.ts` → `src/stores/stores.types.ts`
- Rename: `test/stores/discovery.pagination.spec.ts` → `test/stores/stores.util.spec.ts`
- Rename: `test/stores/discovery.graphql.spec.ts` → `test/stores/stores.graphql.spec.ts`
- Modify: `src/stores/stores.service.ts:4-16`, `src/stores/stores.resolver.ts:12-13`

**Interfaces:**
- Produces: `src/common/validation.ts`의 `isValidId(id: number): boolean`, `validateId(id: string): number`. Task 3이 `validateId`를 import한다.

- [ ] **Step 1: validation 테스트 작성**

`test/common/validation.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';

import { isValidId, validateId } from '../../src/common/validation';

describe('ID 검증', () => {
  it('양의 32비트 정수 문자열을 입력하면 숫자로 반환한다', () => {
    expect(validateId('1')).toBe(1);
    expect(validateId('2147483647')).toBe(2147483647);
  });

  it('정수 형식이 아니거나 범위를 벗어나면 입력 오류를 반환한다', () => {
    for (const id of ['not-an-integer', '0', '01', '-1', '1.5', '2147483648']) {
      expect(() => validateId(id)).toThrow(BadRequestException);
    }
  });

  it('숫자 ID가 32비트 양의 정수이면 유효하다고 판단한다', () => {
    expect(isValidId(1)).toBe(true);
    expect(isValidId(0)).toBe(false);
    expect(isValidId(1.5)).toBe(false);
    expect(isValidId(2147483648)).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `yarn test test/common/validation.spec.ts`
Expected: FAIL — `Cannot find module '../../src/common/validation'`

- [ ] **Step 3: validation.ts 작성**

`src/common/validation.ts`:

```ts
import { BadRequestException } from '@nestjs/common';

const MAX_ID = 2147483647;

export function isValidId(id: number): boolean {
  return Number.isInteger(id) && id > 0 && id <= MAX_ID;
}

export function validateId(id: string): number {
  if (!/^[1-9]\d*$/.test(id) || !isValidId(Number(id))) {
    throw new BadRequestException('Invalid id');
  }
  return Number(id);
}
```

- [ ] **Step 4: 파일 이름 변경**

```bash
git mv src/stores/discovery.pagination.ts src/stores/stores.util.ts
git mv src/stores/discovery.types.ts src/stores/stores.types.ts
git mv test/stores/discovery.pagination.spec.ts test/stores/stores.util.spec.ts
git mv test/stores/discovery.graphql.spec.ts test/stores/stores.graphql.spec.ts
```

- [ ] **Step 5: stores.util.ts에서 ID 검증 제거**

`src/stores/stores.util.ts` 상단을 다음처럼 바꾼다. `MAX_ID`, `validId`, `validateId` 선언을 지우고 `decodeCursor`의 `!validId(value[3])`를 `!isValidId(value[3])`로 바꾼다.

```ts
import { BadRequestException } from '@nestjs/common';

import { isValidId } from '../common/validation';

export type CursorKind = 'nearby' | 'new' | 'store-search' | 'menu-search';
```

```ts
      typeof value[3] !== 'number' ||
      !isValidId(value[3]) ||
```

- [ ] **Step 6: import 경로 수정**

`src/stores/stores.service.ts`:

```ts
import { validateId } from '../common/validation';
import {
  decodeCursor,
  encodeCursor,
  escapeLike,
  slicePage,
  validateFirst,
  validateLocation,
  validateKeyword,
  validateRadius,
} from './stores.util';
import { MenuSearchPage, StorePage } from './stores.types';
```

`src/stores/stores.resolver.ts`:

```ts
import { validateKeyword, validateLocation } from './stores.util';
import { MenuSearchPage, SearchResult, StorePage } from './stores.types';
```

`test/stores/stores.util.spec.ts`: import 목록에서 `validateId`를 빼고 경로를 `'../../src/stores/stores.util'`로 바꾼다. `'반경과 페이지 크기가 허용 범위를 벗어나면 입력 오류를 반환한다'` 테스트에서 `validateId` 다섯 줄을 지운다(Step 1 테스트로 옮겨짐).

`test/stores/stores.graphql.spec.ts`는 import 경로 변경이 없다(`stores.resolver`만 import).

- [ ] **Step 7: 전체 테스트·빌드·린트**

Run: `yarn test && yarn build && yarn lint`
Expected: 전부 PASS. `grep -rn "discovery\." src test` 결과 없음.

- [ ] **Step 8: Commit**

```bash
git add -A src/common/validation.ts src/stores test/common/validation.spec.ts test/stores
git commit -m "refactor(stores): rename discovery files and move validateId to common"
```

---

### Task 2: 상품·SKU 매핑을 ProductsModule로 이동

동작 변경 없는 리팩터다. `search.menus`는 raw SQL만 쓰므로 영향이 없다.

**Files:**
- Rename: `src/stores/product.entity.ts`, `product.schema.ts`, `sku.entity.ts`, `sku.schema.ts` → `src/products/`
- Create: `src/products/products.module.ts`
- Modify: `src/stores/stores.module.ts`, `src/app.module.ts`, `test/app.module.spec.ts`

**Interfaces:**
- Produces: `ProductsModule` (`src/products/products.module.ts`). Task 3·4가 providers를 추가한다.

- [ ] **Step 1: app.module.spec에 ProductsModule 기대값 추가**

`test/app.module.spec.ts`:
- `afterEach`에 `jest.dontMock('../src/products/products.module');` 추가.
- `class MockPromotionsModule {}` 아래에 `class MockProductsModule {}` 추가.
- promotions `doMock` 아래에 추가:

```ts
      jest.doMock('../src/products/products.module', () => ({
        ProductsModule: MockProductsModule,
      }));
```

- `expect.arrayContaining([...])`에 `MockProductsModule` 추가.

- [ ] **Step 2: 실패 확인**

Run: `yarn test test/app.module.spec.ts`
Expected: FAIL — `Cannot find module '../src/products/products.module'` 또는 imports에 `MockProductsModule` 없음.

- [ ] **Step 3: 파일 이동과 모듈 작성**

```bash
mkdir -p src/products
git mv src/stores/product.entity.ts src/products/product.entity.ts
git mv src/stores/product.schema.ts src/products/product.schema.ts
git mv src/stores/sku.entity.ts src/products/sku.entity.ts
git mv src/stores/sku.schema.ts src/products/sku.schema.ts
```

`src/products/products.module.ts`:

```ts
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { ProductSchema } from './product.schema';
import { SkuSchema } from './sku.schema';

@Module({
  imports: [MikroOrmModule.forFeature([ProductSchema, SkuSchema])],
})
export class ProductsModule {}
```

`src/stores/stores.module.ts`:

```ts
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { StoreSchema } from './store.schema';
import { StoresResolver } from './stores.resolver';
import { StoresService } from './stores.service';

@Module({
  imports: [MikroOrmModule.forFeature([StoreSchema])],
  providers: [StoresService, StoresResolver],
  exports: [StoresService],
})
export class StoresModule {}
```

`src/app.module.ts`: `import { ProductsModule } from './products/products.module';`를 추가하고 `imports` 배열의 `StoresModule,` 다음 줄에 `ProductsModule,`을 넣는다.

- [ ] **Step 4: 전체 테스트·빌드·린트**

Run: `yarn test && yarn build && yarn lint`
Expected: 전부 PASS. `ls src/stores`에 product·sku 파일 없음.

- [ ] **Step 5: Commit**

```bash
git add -A src/products src/stores src/app.module.ts test/app.module.spec.ts
git commit -m "refactor(products): move product and sku mappings into ProductsModule"
```

---

### Task 3: 상품 조회 서비스

**Files:**
- Modify: `src/products/product.entity.ts`, `product.schema.ts`, `sku.entity.ts`, `sku.schema.ts`
- Create: `src/products/products.types.ts`, `src/products/products.service.ts`
- Modify: `src/products/products.module.ts`
- Test: `test/products/products.service.spec.ts`

**Interfaces:**
- Consumes: `validateId(id: string): number` from `src/common/validation.ts` (Task 1).
- Produces:
  - `products.types.ts`: `SkuType`(GraphQL `Sku`: `id, name, price, isSoldOut`), `ProductType`(GraphQL `Product`: `id, storeId, name, description, imageUrl, minPrice, isSoldOut, skus`), `Category`(`id, name, productIds`), `StoreProducts`(`categories, products`).
  - `ProductsService.storeProducts(storeId: string): Promise<StoreProducts | null>`
  - `ProductsService.product(id: string): Promise<ProductType | null>`

- [ ] **Step 1: 서비스 테스트 작성**

`test/products/products.service.spec.ts`:

```ts
import type { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException } from '@nestjs/common';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { ProductsService } from '../../src/products/products.service';

const row = (
  id: number,
  skuId: number,
  price: number,
  isSoldOut = false,
) => ({
  id,
  store_id: 1,
  name: `상품${id}`,
  description: null,
  image_url: null,
  sku_id: skuId,
  sku_name: `SKU${skuId}`,
  price,
  is_sold_out: isSoldOut,
});

describe('ProductsService', () => {
  const execute = jest.fn<Promise<unknown[]>, [string, unknown[]]>();
  const service = new ProductsService({ execute } as unknown as EntityManager);

  beforeEach(() => execute.mockReset());

  it('없거나 비활성인 매장을 조회하면 null을 반환한다', async () => {
    execute.mockResolvedValueOnce([]);

    await expect(service.storeProducts('1')).resolves.toBeNull();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toContain('is_active');
    expect(execute.mock.calls[0][1]).toEqual([1]);
  });

  it('노출할 상품이 없는 활성 매장을 조회하면 빈 목록을 반환한다', async () => {
    execute
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(service.storeProducts('1')).resolves.toEqual({
      categories: [],
      products: [],
    });
  });

  it('매장 상품을 조회하면 SKU를 상품별로 묶고 최저가와 품절 여부를 계산한다', async () => {
    execute
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([
        row(10, 100, 3500, true),
        row(10, 101, 4000, false),
        row(11, 110, 4500, true),
      ])
      .mockResolvedValueOnce([]);

    const result = await service.storeProducts('1');

    expect(result?.products).toEqual([
      {
        id: 10,
        storeId: 1,
        name: '상품10',
        description: null,
        imageUrl: null,
        minPrice: 3500,
        isSoldOut: false,
        skus: [
          { id: 100, name: 'SKU100', price: 3500, isSoldOut: true },
          { id: 101, name: 'SKU101', price: 4000, isSoldOut: false },
        ],
      },
      {
        id: 11,
        storeId: 1,
        name: '상품11',
        description: null,
        imageUrl: null,
        minPrice: 4500,
        isSoldOut: true,
        skus: [{ id: 110, name: 'SKU110', price: 4500, isSoldOut: true }],
      },
    ]);
    const [sql, params] = execute.mock.calls[1];
    expect(sql).toContain('JOIN store s ON s.id = p.store_id AND s.is_active');
    expect(sql).toContain('JOIN sku k ON k.product_id = p.id AND k.is_active');
    expect(sql).toContain('p.is_active');
    expect(sql).toContain('p.store_id = ?');
    expect(sql).toContain('ORDER BY p.name ASC, p.id ASC, k.price ASC, k.id ASC');
    expect(params).toEqual([1]);
  });

  it('카테고리를 조회하면 노출 상품만 남기고 빈 카테고리를 제외한다', async () => {
    execute
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([
        row(10, 100, 3500),
        row(11, 110, 4500),
        row(12, 120, 5000),
      ])
      .mockResolvedValueOnce([
        { id: 1, name: '인기', product_id: 10 },
        { id: 2, name: '커피', product_id: 11 },
        { id: 2, name: '커피', product_id: 10 },
        { id: 2, name: '커피', product_id: 99 },
        { id: 3, name: '디저트', product_id: 99 },
      ]);

    const result = await service.storeProducts('1');

    expect(result?.categories).toEqual([
      { id: 1, name: '인기', productIds: [10] },
      { id: 2, name: '커피', productIds: [11, 10] },
    ]);
    expect(result?.products.map(({ id }) => id)).toEqual([10, 11, 12]);
    const [sql, params] = execute.mock.calls[2];
    expect(sql).toContain('JOIN product_category pc ON pc.category_id = c.id');
    expect(sql).toContain('c.store_id = ? AND c.is_active');
    expect(sql).toContain(
      'ORDER BY c.sort_order ASC, c.id ASC, pc.sort_order ASC, pc.product_id ASC',
    );
    expect(params).toEqual([1]);
  });

  it('상품 상세를 조회하면 활성 SKU와 함께 반환한다', async () => {
    execute.mockResolvedValueOnce([
      row(10, 100, 3500),
      row(10, 101, 4000, true),
    ]);

    await expect(service.product('10')).resolves.toMatchObject({
      id: 10,
      storeId: 1,
      minPrice: 3500,
      isSoldOut: false,
      skus: [{ id: 100 }, { id: 101, isSoldOut: true }],
    });
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('JOIN store s ON s.id = p.store_id AND s.is_active');
    expect(sql).toContain('JOIN sku k ON k.product_id = p.id AND k.is_active');
    expect(sql).toContain('p.id = ?');
    expect(params).toEqual([10]);
  });

  it('노출할 수 없는 상품을 조회하면 null을 반환한다', async () => {
    execute.mockResolvedValueOnce([]);

    await expect(service.product('10')).resolves.toBeNull();
  });

  it('잘못된 ID로 조회하면 DB 조회 없이 입력 오류를 반환한다', async () => {
    await expect(service.storeProducts('abc')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.product('0')).rejects.toThrow(BadRequestException);
    expect(execute).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `yarn test test/products/products.service.spec.ts`
Expected: FAIL — `Cannot find module '../../src/products/products.service'`

- [ ] **Step 3: 엔티티·스키마 컬럼 추가**

`src/products/product.entity.ts`:

```ts
export class Product {
  id!: number;
  storeId!: number;
  name!: string;
  description: string | null = null;
  imageUrl: string | null = null;
  isActive = true;
}
```

`src/products/product.schema.ts`의 `properties`에 `name` 다음으로 추가:

```ts
    description: { type: 'text', nullable: true },
    imageUrl: { type: 'text', nullable: true },
```

`src/products/sku.entity.ts`:

```ts
export class Sku {
  id!: number;
  productId!: number;
  name!: string;
  price!: number;
  isActive = true;
  isSoldOut = false;
}
```

`src/products/sku.schema.ts`의 `properties`에 `isActive` 다음으로 추가:

```ts
    isSoldOut: { type: Boolean, default: false },
```

- [ ] **Step 4: GraphQL 타입 작성**

`src/products/products.types.ts`:

```ts
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Sku')
export class SkuType {
  @Field(() => ID)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Int)
  price!: number;

  @Field()
  isSoldOut!: boolean;
}

@ObjectType('Product')
export class ProductType {
  @Field(() => ID)
  id!: number;

  @Field(() => ID)
  storeId!: number;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  imageUrl!: string | null;

  @Field(() => Int)
  minPrice!: number;

  @Field()
  isSoldOut!: boolean;

  @Field(() => [SkuType])
  skus!: SkuType[];
}

@ObjectType()
export class Category {
  @Field(() => ID)
  id!: number;

  @Field()
  name!: string;

  @Field(() => [ID])
  productIds!: number[];
}

@ObjectType()
export class StoreProducts {
  @Field(() => [Category])
  categories!: Category[];

  @Field(() => [ProductType])
  products!: ProductType[];
}
```

- [ ] **Step 5: 서비스 작성**

`src/products/products.service.ts`:

```ts
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { validateId } from '../common/validation';
import { Category, ProductType, StoreProducts } from './products.types';

type ProductRow = {
  id: number;
  store_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  sku_id: number;
  sku_name: string;
  price: number;
  is_sold_out: boolean;
};

type CategoryRow = { id: number; name: string; product_id: number };

const PRODUCT_SQL = `SELECT p.id, p.store_id, p.name, p.description, p.image_url,
  k.id AS sku_id, k.name AS sku_name, k.price, k.is_sold_out
  FROM product p
  JOIN store s ON s.id = p.store_id AND s.is_active
  JOIN sku k ON k.product_id = p.id AND k.is_active
  WHERE p.is_active`;

// 행 순서(상품 정렬 후 SKU 정렬)를 그대로 유지하며 상품별로 묶는다.
function toProducts(rows: ProductRow[]): ProductType[] {
  const products = new Map<number, ProductType>();
  for (const row of rows) {
    let product = products.get(row.id);
    if (!product) {
      product = {
        id: row.id,
        storeId: row.store_id,
        name: row.name,
        description: row.description,
        imageUrl: row.image_url,
        minPrice: row.price,
        isSoldOut: true,
        skus: [],
      };
      products.set(row.id, product);
    }
    product.skus.push({
      id: row.sku_id,
      name: row.sku_name,
      price: row.price,
      isSoldOut: row.is_sold_out,
    });
    product.minPrice = Math.min(product.minPrice, row.price);
    product.isSoldOut &&= row.is_sold_out;
  }
  return [...products.values()];
}

@Injectable()
export class ProductsService {
  constructor(private readonly em: EntityManager) {}

  async storeProducts(storeId: string): Promise<StoreProducts | null> {
    const id = validateId(storeId);
    const stores = await this.em.execute<{ id: number }[]>(
      'SELECT id FROM store WHERE id = ? AND is_active',
      [id],
    );
    if (stores.length === 0) return null;

    const products = toProducts(
      await this.em.execute<ProductRow[]>(
        `${PRODUCT_SQL} AND p.store_id = ?
        ORDER BY p.name ASC, p.id ASC, k.price ASC, k.id ASC`,
        [id],
      ),
    );
    const visible = new Set(products.map(({ id }) => id));
    const rows = await this.em.execute<CategoryRow[]>(
      `SELECT c.id, c.name, pc.product_id
       FROM category c
       JOIN product_category pc ON pc.category_id = c.id
       WHERE c.store_id = ? AND c.is_active
       ORDER BY c.sort_order ASC, c.id ASC, pc.sort_order ASC, pc.product_id ASC`,
      [id],
    );
    const categories = new Map<number, Category>();
    for (const row of rows) {
      if (!visible.has(row.product_id)) continue;
      let category = categories.get(row.id);
      if (!category) {
        category = { id: row.id, name: row.name, productIds: [] };
        categories.set(row.id, category);
      }
      category.productIds.push(row.product_id);
    }
    return { categories: [...categories.values()], products };
  }

  async product(id: string): Promise<ProductType | null> {
    const rows = await this.em.execute<ProductRow[]>(
      `${PRODUCT_SQL} AND p.id = ? ORDER BY k.price ASC, k.id ASC`,
      [validateId(id)],
    );
    return toProducts(rows)[0] ?? null;
  }
}
```

`visible`은 이 매장의 노출 상품만 담으므로 다른 매장 상품, 비활성 상품, 활성 SKU가 없는 상품에 연결된 행이 함께 걸러진다. 노출 상품이 하나도 연결되지 않은 카테고리는 Map에 들어가지 않는다.

`src/products/products.module.ts`의 `@Module`에 `providers: [ProductsService],`를 추가하고 `import { ProductsService } from './products.service';`를 넣는다.

- [ ] **Step 6: 통과 확인**

Run: `yarn test test/products/products.service.spec.ts`
Expected: PASS (7 tests)

- [ ] **Step 7: Commit**

```bash
git add src/products test/products/products.service.spec.ts
git commit -m "feat(products): query store products with categories and sold-out SKUs"
```

---

### Task 4: GraphQL resolver와 스키마

**Files:**
- Create: `src/products/products.resolver.ts`
- Modify: `src/products/products.module.ts`, `schema.gql`
- Test: `test/products/products.resolver.spec.ts`, `test/products/products.graphql.spec.ts`

**Interfaces:**
- Consumes: `ProductsService.storeProducts(storeId: string)`, `ProductsService.product(id: string)`, `StoreProducts`, `ProductType` (Task 3).
- Produces: GraphQL `Query.storeProducts(storeId: ID!): StoreProducts`, `Query.product(id: ID!): Product`.

- [ ] **Step 1: resolver·스키마 테스트 작성**

`test/products/products.resolver.spec.ts`:

```ts
jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { ProductsResolver } from '../../src/products/products.resolver';
import type { ProductsService } from '../../src/products/products.service';

describe('ProductsResolver', () => {
  it('매장 상품을 요청하면 서비스 결과를 반환한다', async () => {
    const result = { categories: [], products: [] };
    const storeProducts = jest.fn().mockResolvedValue(result);
    const resolver = new ProductsResolver({
      storeProducts,
    } as unknown as ProductsService);

    await expect(resolver.storeProducts('1')).resolves.toBe(result);
    expect(storeProducts).toHaveBeenCalledWith('1');
  });

  it('상품 상세를 요청하면 서비스 결과를 반환한다', async () => {
    const product = jest.fn().mockResolvedValue(null);
    const resolver = new ProductsResolver({
      product,
    } as unknown as ProductsService);

    await expect(resolver.product('10')).resolves.toBeNull();
    expect(product).toHaveBeenCalledWith('10');
  });
});
```

`test/products/products.graphql.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { printSchema } from 'graphql';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { ProductsResolver } from '../../src/products/products.resolver';

describe('매장 상품 GraphQL 스키마', () => {
  it('상품 쿼리를 구성하면 목록과 상세 타입이 스키마에 표시된다', async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();
    const schema = await module
      .get(GraphQLSchemaFactory)
      .create([ProductsResolver]);

    expect(Object.keys(schema.getQueryType()?.getFields() ?? {})).toEqual([
      'storeProducts',
      'product',
    ]);
    const sdl = printSchema(schema);
    expect(sdl).toContain('storeProducts(storeId: ID!): StoreProducts');
    expect(sdl).toContain('product(id: ID!): Product');
    expect(sdl).toContain('categories: [Category!]!');
    expect(sdl).toContain('products: [Product!]!');
    expect(sdl).toContain('productIds: [ID!]!');
    expect(sdl).toContain('storeId: ID!');
    expect(sdl).toContain('description: String');
    expect(sdl).toContain('imageUrl: String');
    expect(sdl).toContain('minPrice: Int!');
    expect(sdl).toContain('skus: [Sku!]!');
    expect(sdl).toContain('isSoldOut: Boolean!');
    await module.close();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `yarn test test/products`
Expected: FAIL — `Cannot find module '../../src/products/products.resolver'`

- [ ] **Step 3: resolver 작성과 등록**

`src/products/products.resolver.ts`:

```ts
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

import { ProductsService } from './products.service';
import { ProductType, StoreProducts } from './products.types';

@Resolver()
export class ProductsResolver {
  constructor(private readonly service: ProductsService) {}

  @Query(() => StoreProducts, { nullable: true })
  storeProducts(@Args('storeId', { type: () => ID }) storeId: string) {
    return this.service.storeProducts(storeId);
  }

  @Query(() => ProductType, { nullable: true })
  product(@Args('id', { type: () => ID }) id: string) {
    return this.service.product(id);
  }
}
```

`src/products/products.module.ts`를 최종 형태로:

```ts
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { ProductSchema } from './product.schema';
import { ProductsResolver } from './products.resolver';
import { ProductsService } from './products.service';
import { SkuSchema } from './sku.schema';

@Module({
  imports: [MikroOrmModule.forFeature([ProductSchema, SkuSchema])],
  providers: [ProductsService, ProductsResolver],
})
export class ProductsModule {}
```

- [ ] **Step 4: 전체 테스트·빌드·린트**

Run: `yarn test && yarn build && yarn lint`
Expected: 전부 PASS.

- [ ] **Step 5: schema.gql 재생성**

`autoSchemaFile`은 앱 부팅 시 `schema.gql`을 다시 쓴다. `environments/.env`의 `DATABASE_URL`이 접속 가능한 상태에서:

Run: `yarn start` → `Nest application successfully started` 로그 확인 후 종료(Ctrl+C).
Expected: `git diff schema.gql`에 `Category`, `Product`, `Sku`, `StoreProducts` 타입과 `product(id: ID!): Product`, `storeProducts(storeId: ID!): StoreProducts` 쿼리만 추가된다.

DB에 접속할 수 없어 부팅이 실패하면 이 단계를 건너뛰고 결과 보고에 "schema.gql 미갱신"을 명시한다.

- [ ] **Step 6: graphify 갱신**

Run: `graphify update .`

- [ ] **Step 7: Commit**

```bash
git add src/products test/products schema.gql graphify-out
git commit -m "feat(products): expose storeProducts and product GraphQL queries"
```

---

## 완료 후 사용자에게 제공할 것

구현 결과 메시지에 spec의 DDL과 아래 샘플 데이터 SQL을 제공한다(저장소에는 추가하지 않는다). `store` id 1이 존재한다고 가정한다.

```sql
BEGIN;
INSERT INTO product (store_id, name, description) VALUES
  (1, '아메리카노', '고소한 원두로 만든 아메리카노'),
  (1, '카페라떼', '부드러운 우유와 에스프레소'),
  (1, '치즈케이크', '진한 크림치즈 케이크');

INSERT INTO sku (product_id, name, price, is_sold_out)
SELECT p.id, v.name, v.price, v.is_sold_out
FROM product p
JOIN (VALUES
  ('아메리카노', 'HOT', 3500, false),
  ('아메리카노', 'ICE', 4000, false),
  ('카페라떼', 'HOT', 4500, false),
  ('카페라떼', 'ICE', 5000, true),
  ('치즈케이크', '기본', 6000, true)
) AS v(product_name, name, price, is_sold_out) ON v.product_name = p.name
WHERE p.store_id = 1;

INSERT INTO category (store_id, name, sort_order) VALUES
  (1, '인기', 0), (1, '커피', 1), (1, '디저트', 2);

INSERT INTO product_category (category_id, product_id, sort_order)
SELECT c.id, p.id, v.sort_order
FROM (VALUES
  ('인기', '아메리카노', 0),
  ('커피', '아메리카노', 0),
  ('커피', '카페라떼', 1),
  ('디저트', '치즈케이크', 0)
) AS v(category_name, product_name, sort_order)
JOIN category c ON c.store_id = 1 AND c.name = v.category_name
JOIN product p ON p.store_id = 1 AND p.name = v.product_name;
COMMIT;
```

확인 쿼리: `{ storeProducts(storeId: "1") { categories { id name productIds } products { id name minPrice isSoldOut skus { name price isSoldOut } } } }` — 치즈케이크는 `isSoldOut: true`, 카페라떼는 `false`여야 한다.
