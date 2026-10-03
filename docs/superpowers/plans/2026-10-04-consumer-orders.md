# Consumer 주문 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 결제를 마친 장바구니를 주문으로 기록하는 `createOrder`와, 본인 주문을 조회하는 `orders`, `order(id)`를 GraphQL로 제공한다.

**Architecture:** 먼저 동작 변경 없이 커서 페이지네이션 헬퍼를 `src/common/pagination.ts`로 옮기고, 기존 페이지 인자 `first`/`after`를 `size`/`cursor`로 바꾼다. 그다음 `src/orders/` 모듈을 추가한다. `OrdersService`는 raw SQL로 주문을 조회하고, 생성할 때는 카운터 테이블 upsert로 매장·일별 주문번호를 부여한다. 이때 주문과 항목 INSERT를 한 트랜잭션에서 실행한다. 중복 생성은 `UNIQUE (user_id, cart_id)`로 막는다.

**Tech Stack:** NestJS 11, `@nestjs/graphql` code-first(Apollo), MikroORM 7 `EntityManager.execute`/`transactional`, PostgreSQL, class-validator/class-transformer, Jest + ts-jest.

**Spec:** `docs/superpowers/specs/2026-10-04-consumer-orders-design.md`

## Global Constraints

- 테스트 이름은 `~하면 ~한다` 형식으로 쓴다.
- ID는 양의 32비트 정수(`1`~`2147483647`)이며 GraphQL에서는 `ID` 문자열로 받는다. 잘못된 값은 `validateId`가 `BadRequestException('Invalid id')`를 던진다.
- `createOrder`는 결제 후 기록이다. 가격, 품절, 매장 활성·영업, 상품·SKU 존재를 검사하지 않는다. 매장 행 존재만 확인한다.
- 사용자 ID는 GraphQL 인자로 받지 않고 `req.userId`만 쓴다.
- 애플리케이션은 DDL·seed를 실행하지 않고, 저장소에 SQL·seed 파일을 추가하지 않는다. 샘플 SQL은 구현 결과 메시지로만 제공한다.
- 외래 키를 추가하지 않는다. 주문 테이블에는 엔티티를 만들지 않는다.
- raw SQL에서 주문 테이블은 항상 `"order"`로 쓴다.
- 조회는 N+1을 만들지 않는다.
- 주문번호 prefix는 `'A'`, 주문일은 `(now() AT TIME ZONE 'Asia/Seoul')::date`.
- 코드를 수정한 뒤 `graphify update .`를 실행한다.
- 명령은 저장소 루트(`/Users/seop/Workspace/prepick-server`)에서 `yarn`으로 실행한다.

## Review Focus

- 매장이 비활성이거나 영업 종료여도 결제 후 들어온 주문은 기록해야 한다 — Task 4 테스트가 매장 조회 SQL에 `is_active`, `is_open` 조건이 없음을 확인한다.
- 다른 사용자가 같은 `cartId`를 써도 서로의 주문을 반환하면 안 된다 — Task 4 테스트가 `cartId` 조회 파라미터에 `userId`가 들어가는지 확인하고, Task 6이 실제 DB에서 확인한다.
- 중복 `cartId` 경합에서 진 트랜잭션은 주문번호를 소모하면 안 된다(롤백) — Task 6 테스트.
- 같은 시각에 생성된 주문이 페이지 경계에 걸려도 빠지거나 중복되면 안 된다 — Task 3 테스트가 `(created_at, id) <` 조건과 마이크로초 커서 키를 확인한다.
- 주문이 하나도 없는 사용자의 목록은 빈 목록이어야 하고, 항목 조회를 하지 않아야 한다 — Task 3 테스트.

---

## File Structure

```text
src/common/pagination.ts            (신규) CursorKind, validateSize, encodeCursor, decodeCursor, slicePage
src/stores/stores.util.ts           페이지네이션 함수 제거, 좌표·반경·검색어 검증만 남김
src/stores/stores.service.ts        pagination import, first/after → size/cursor
src/stores/stores.resolver.ts       GraphQL 인자 first/after → size/cursor
src/orders/orders.types.ts          (신규) Order, OrderItem, OrderPage, CreateOrderInput, OrderItemInput
src/orders/orders.service.ts        (신규) createOrder, findOrders, findOrder
src/orders/orders.resolver.ts       (신규) createOrder, orders, order
src/orders/orders.module.ts         (신규)
src/app.module.ts                   OrdersModule 등록
test/common/pagination.spec.ts      (신규) stores.util.spec.ts에서 커서·페이지 테스트 이동
test/stores/stores.util.spec.ts     페이지네이션 테스트 제거
test/stores/stores.graphql.spec.ts  size/cursor SDL 기대값
test/orders/orders.input.spec.ts    (신규) 입력 검증
test/orders/orders.service.spec.ts  (신규)
test/orders/orders.resolver.spec.ts (신규)
test/orders/orders.graphql.spec.ts  (신규)
test/orders/orders.integration-spec.ts (신규) 실제 DB 동시성
test/app.module.spec.ts             OrdersModule mock 추가
schema.gql                          재생성
```

---

### Task 1: 페이지네이션 헬퍼를 common으로 옮기고 인자 이름을 size/cursor로 변경

**Files:**
- Create: `src/common/pagination.ts`
- Modify: `src/stores/stores.util.ts`, `src/stores/stores.service.ts`, `src/stores/stores.resolver.ts`, `schema.gql`
- Test: `test/common/pagination.spec.ts` (신규), `test/stores/stores.util.spec.ts`, `test/stores/stores.graphql.spec.ts`

**Interfaces:**
- Consumes: `isValidId(id: number): boolean` (`src/common/validation.ts`, 기존)
- Produces (`src/common/pagination.ts`):
  - `type CursorKind = 'nearby' | 'new' | 'store-search' | 'menu-search'`
  - `validateSize(size = 20): number` — 1~50이 아니면 `BadRequestException('size must be 1-50')`
  - `encodeCursor(kind: CursorKind, scope: string, key: string | number, id: number): string`
  - `decodeCursor(kind: CursorKind, scope: string, cursor?: string | null): { key: string | number; id: number } | null`
  - `slicePage<T>(rows: T[], size: number, makeCursor: (row: T) => string): { items: T[]; nextCursor: string | null }`
  - GraphQL: `stores(..., size: Int = 20, cursor: String)`, `newStores(size: Int = 20, cursor: String)`, `SearchResult.stores(size: Int = 20, cursor: String)`, `SearchResult.menus(size: Int = 20, cursor: String)`

- [ ] **Step 1: 테스트를 새 위치와 새 이름 기준으로 옮긴다 (실패 상태)**

`test/common/pagination.spec.ts` 생성:

```ts
import { BadRequestException } from '@nestjs/common';

import {
  decodeCursor,
  encodeCursor,
  slicePage,
  validateSize,
} from '../../src/common/pagination';

const ID = 1;

describe('커서 페이지네이션', () => {
  it('페이지 크기가 1~50을 벗어나면 입력 오류를 반환한다', () => {
    expect(() => validateSize(0)).toThrow(BadRequestException);
    expect(() => validateSize(51)).toThrow(BadRequestException);
    expect(validateSize(50)).toBe(50);
    expect(validateSize()).toBe(20);
  });

  it('다른 검색어 또는 목록의 커서를 사용하면 입력 오류를 반환한다', () => {
    const cursor = encodeCursor('store-search', 'coffee', 'Cafe', ID);
    expect(() => decodeCursor('store-search', 'tea', cursor)).toThrow(
      BadRequestException,
    );
    expect(() => decodeCursor('menu-search', 'coffee', cursor)).toThrow(
      BadRequestException,
    );
    expect(() => decodeCursor('store-search', 'coffee', 'invalid')).toThrow(
      BadRequestException,
    );
    expect(decodeCursor('store-search', 'coffee', cursor)).toEqual({
      key: 'Cafe',
      id: ID,
    });
    const oldUuidCursor = Buffer.from(
      JSON.stringify([
        'store-search',
        'coffee',
        'Cafe',
        '00000000-0000-4000-8000-000000000001',
      ]),
    ).toString('base64url');
    expect(() => decodeCursor('store-search', 'coffee', oldUuidCursor)).toThrow(
      BadRequestException,
    );
  });

  it('한 건을 더 받으면 마지막으로 보여준 항목의 커서를 반환한다', () => {
    expect(slicePage([1, 2, 3], 2, String)).toEqual({
      items: [1, 2],
      nextCursor: '2',
    });
  });

  it('신규 매장 커서에 마이크로초 시각이 있으면 그대로 복원한다', () => {
    const key = '2026-09-25T12:34:56.123456Z';
    expect(decodeCursor('new', '', encodeCursor('new', '', key, ID))).toEqual({
      key,
      id: ID,
    });
  });
});
```

`test/stores/stores.util.spec.ts` 전체를 다음으로 교체:

```ts
import { BadRequestException } from '@nestjs/common';

import {
  escapeLike,
  validateKeyword,
  validateLocation,
  validateRadius,
} from '../../src/stores/stores.util';

describe('매장 탐색 입력', () => {
  it('좌표가 없으면 검색을 허용하고 주변 조회에서는 거부한다', () => {
    expect(validateLocation(undefined, undefined, false)).toBeNull();
    expect(() => validateLocation(undefined, undefined, true)).toThrow(
      BadRequestException,
    );
  });

  it('좌표 하나만 있거나 범위를 벗어나면 입력 오류를 반환한다', () => {
    expect(() => validateLocation(37.5, undefined, false)).toThrow(
      BadRequestException,
    );
    expect(() => validateLocation(91, 127, true)).toThrow(BadRequestException);
    expect(() => validateLocation(37.5, Infinity, true)).toThrow(
      BadRequestException,
    );
  });

  it('반경이 허용 범위를 벗어나면 입력 오류를 반환한다', () => {
    expect(() => validateRadius(51)).toThrow(BadRequestException);
    expect(() => validateRadius(0)).toThrow(BadRequestException);
  });

  it('검색어를 정리하면 와일드카드를 문자 그대로 찾도록 만든다', () => {
    expect(validateKeyword(' 50%_# ')).toBe('50%_#');
    expect(escapeLike('50%_#')).toBe('50#%#_##');
    expect(() => validateKeyword('   ')).toThrow(BadRequestException);
  });
});
```

`test/stores/stores.graphql.spec.ts`의 SDL 기대값 세 개를 교체:

```ts
    expect(sdl).toContain(
      'stores(latitude: Float!, longitude: Float!, radiusKm: Float = 5, size: Int = 20, cursor: String): StorePage!',
    );
    expect(sdl).toContain('stores(size: Int = 20, cursor: String): StorePage!');
    expect(sdl).toContain(
      'menus(size: Int = 20, cursor: String): MenuSearchPage!',
    );
```

그리고 같은 파일에 `newStores` 기대값을 추가:

```ts
    expect(sdl).toContain(
      'newStores(size: Int = 20, cursor: String): StorePage!',
    );
```

- [ ] **Step 2: 실패 확인**

Run: `yarn test test/common/pagination.spec.ts test/stores`
Expected: FAIL — `Cannot find module '../../src/common/pagination'`, `stores.graphql.spec.ts`의 `size: Int = 20` 기대값 불일치.

- [ ] **Step 3: `src/common/pagination.ts` 생성**

`src/stores/stores.util.ts`의 `CursorKind`, `encodeCursor`, `decodeCursor`, `slicePage`를 그대로 옮기고 `validateFirst`를 `validateSize`로 바꾼다.

```ts
import { BadRequestException } from '@nestjs/common';

import { isValidId } from './validation';

export type CursorKind = 'nearby' | 'new' | 'store-search' | 'menu-search';

export function validateSize(size = 20): number {
  if (!Number.isInteger(size) || size < 1 || size > 50) {
    throw new BadRequestException('size must be 1-50');
  }
  return size;
}

export function encodeCursor(
  kind: CursorKind,
  scope: string,
  key: string | number,
  id: number,
): string {
  return Buffer.from(JSON.stringify([kind, scope, key, id])).toString(
    'base64url',
  );
}

export function decodeCursor(
  kind: CursorKind,
  scope: string,
  cursor?: string | null,
): { key: string | number; id: number } | null {
  if (cursor == null) return null;
  try {
    if (cursor.length > 2048) throw new Error();
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    if (Buffer.from(raw).toString('base64url') !== cursor) throw new Error();
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length !== 4) throw new Error();
    const [cursorKind, cursorScope, key, id] = value as unknown[];
    if (
      cursorKind !== kind ||
      cursorScope !== scope ||
      typeof id !== 'number' ||
      !isValidId(id) ||
      (kind === 'nearby'
        ? typeof key !== 'number' || !Number.isFinite(key)
        : typeof key !== 'string')
    ) {
      throw new Error();
    }
    if (kind === 'new') {
      const date = key as string;
      if (
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(?:\d{3})?Z$/.test(date) ||
        new Date(date).toISOString().slice(0, 23) !== date.slice(0, 23)
      ) {
        throw new Error();
      }
    }
    return { key: key as string | number, id };
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}

export function slicePage<T>(
  rows: T[],
  size: number,
  makeCursor: (row: T) => string,
): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, size);
  return {
    items,
    nextCursor: rows.length > size ? makeCursor(items[items.length - 1]) : null,
  };
}
```

- [ ] **Step 4: `src/stores/stores.util.ts`에서 옮긴 함수 제거**

파일 전체를 다음으로 교체:

```ts
import { BadRequestException } from '@nestjs/common';

export function validateLocation(
  latitude?: number | null,
  longitude?: number | null,
  required = false,
): { latitude: number; longitude: number } | null {
  if (latitude == null && longitude == null && !required) return null;
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new BadRequestException('Invalid location');
  }
  return { latitude, longitude };
}

export function validateRadius(radiusKm = 5): number {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 50) {
    throw new BadRequestException(
      'radiusKm must be greater than 0 and at most 50',
    );
  }
  return radiusKm;
}

export function validateKeyword(keyword: string): string {
  const normalized = keyword.trim();
  if (normalized.length < 1 || normalized.length > 100) {
    throw new BadRequestException('Invalid keyword');
  }
  return normalized;
}

export function escapeLike(keyword: string): string {
  return keyword.replace(/([#%_])/g, '#$1');
}
```

- [ ] **Step 5: `src/stores/stores.service.ts`를 새 이름으로 변경**

import를 교체:

```ts
import { validateId } from '../common/validation';
import {
  decodeCursor,
  encodeCursor,
  slicePage,
  validateSize,
} from '../common/pagination';
import {
  escapeLike,
  validateLocation,
  validateKeyword,
  validateRadius,
} from './stores.util';
```

네 메서드(`findNearbyStores`, `findNewStores`, `searchStores`, `searchMenus`)에서 다음 이름을 바꾼다. SQL과 로직은 바꾸지 않는다.

| 기존 | 변경 |
|---|---|
| 파라미터 `first = 20` | `size = 20` |
| 파라미터 `after?: string \| null` | `cursor?: string \| null` |
| `validateFirst(first)` | `validateSize(size)` |
| `const cursor = decodeCursor(..., after)` | `const start = decodeCursor(..., cursor)` |
| SQL 템플릿의 `${cursor ? ... : ''}` | `${start ? ... : ''}` |
| 파라미터 배열의 `...(cursor ? [cursor.key, cursor.id] : [])` | `...(start ? [start.key, start.id] : [])` |
| `first + 1` | `size + 1` |
| `slicePage(rows, first, ...)` | `slicePage(rows, size, ...)` |

예시로 `findNewStores`는 다음과 같이 된다.

```ts
  async findNewStores(size = 20, cursor?: string | null): Promise<StorePage> {
    validateSize(size);
    const start = decodeCursor('new', '', cursor);
    const rows = await this.em.execute<StoreRow[]>(
      `SELECT *, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_created_at
       FROM store WHERE is_active
      ${start ? 'AND (created_at, id) < (?::timestamptz, ?::integer)' : ''}
      ORDER BY created_at DESC, id DESC LIMIT ?`,
      [...(start ? [start.key, start.id] : []), size + 1],
    );
    const page = slicePage(rows, size, (row) =>
      encodeCursor(
        'new',
        '',
        row.cursor_created_at ?? new Date(row.created_at).toISOString(),
        row.id,
      ),
    );
    return {
      items: page.items.map((row) => storeFromRow(row)),
      nextCursor: page.nextCursor,
    };
  }
```

- [ ] **Step 6: `src/stores/stores.resolver.ts`의 GraphQL 인자 이름 변경**

`stores`, `newStores`, `searchStores`, `searchMenus`의 두 인자 데코레이터를 모두 다음 형태로 바꾸고, 본문에서 서비스에 넘기는 변수 이름도 맞춘다.

```ts
    @Args('size', { type: () => Int, nullable: true, defaultValue: 20 })
    size: number,
    @Args('cursor', { type: () => String, nullable: true })
    cursor?: string | null,
```

예시로 `newStores`는 다음과 같이 된다.

```ts
  @Query(() => StorePage)
  newStores(
    @Args('size', { type: () => Int, nullable: true, defaultValue: 20 })
    size: number,
    @Args('cursor', { type: () => String, nullable: true })
    cursor?: string | null,
  ) {
    return this.service.findNewStores(size, cursor);
  }
```

`stores`는 `this.service.findNearbyStores(latitude, longitude, radiusKm, size, cursor)`, `searchStores`는 `this.service.searchStores(parent.keyword, location, size, cursor)`, `searchMenus`는 `this.service.searchMenus(parent.keyword, location, size, cursor)`를 호출한다.

- [ ] **Step 7: 전체 테스트 통과 확인**

Run: `yarn test`
Expected: 전부 PASS. `test/stores/stores.service.spec.ts`와 `test/stores/stores.resolver.spec.ts`는 위치 인자만 쓰므로 수정 없이 통과한다.

Run: `yarn lint && yarn build`
Expected: 오류 없음.

- [ ] **Step 8: schema.gql 재생성**

`autoSchemaFile`은 앱 부팅 시 `schema.gql`을 다시 쓴다. `environments/.env`의 `DATABASE_URL`에 접속할 수 있는 상태에서:

Run: `yarn start` → `Nest application successfully started` 로그를 확인한 뒤 종료(Ctrl+C).
Expected: `git diff schema.gql`에서 `first: Int = 20, after: String`이 `size: Int = 20, cursor: String`으로만 바뀐다(4곳).

DB에 접속할 수 없어 부팅이 실패하면 이 단계를 건너뛰고 결과 보고에 "schema.gql 미갱신"을 명시한다.

- [ ] **Step 9: graphify 갱신과 커밋**

Run: `graphify update .`

```bash
git add src/common/pagination.ts src/stores test/common/pagination.spec.ts test/stores schema.gql graphify-out
git commit -m "refactor: move cursor pagination to common and rename page args to size/cursor"
```

---

### Task 2: 주문 GraphQL 타입과 입력 검증

**Files:**
- Create: `src/orders/orders.types.ts`
- Test: `test/orders/orders.input.spec.ts`

**Interfaces:**
- Produces (`src/orders/orders.types.ts`):
  - `OrderItemInput { productId: string; skuId: string; productName: string; skuName: string; price: number; quantity: number }`
  - `CreateOrderInput { cartId: string; storeId: string; amount: number; request?: string | null; paidAt: Date; items: OrderItemInput[] }`
  - `OrderItemType` (GraphQL `OrderItem`) `{ id: number; productId: number; skuId: number; productName: string; skuName: string; price: number; quantity: number }`
  - `OrderType` (GraphQL `Order`) `{ id: number; storeId: number; storeName: string; prefixOrderNumber: string; orderNumber: number; amount: number; request: string | null; items: OrderItemType[]; paidAt: Date; createdAt: Date }`
  - `OrderPage { items: OrderType[]; nextCursor: string | null }`

전역 `ValidationPipe({ transform: true, whitelist: true })`는 데코레이터가 없는 필드를 지운다. 그래서 모든 입력 필드에 class-validator 데코레이터가 하나 이상 있어야 한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`test/orders/orders.input.spec.ts`:

```ts
import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { CreateOrderInput } from '../../src/orders/orders.types';

const pipe = new ValidationPipe({ transform: true, whitelist: true });
const validate = (value: unknown) =>
  pipe.transform(value, { type: 'body', metatype: CreateOrderInput });

const item = (overrides: Record<string, unknown> = {}) => ({
  productId: '1',
  skuId: '2',
  productName: '아메리카노',
  skuName: 'ICE',
  price: 4000,
  quantity: 2,
  ...overrides,
});

const input = (overrides: Record<string, unknown> = {}) => ({
  cartId: 'cart-1',
  storeId: '1',
  amount: 8000,
  request: '빨대 주세요.',
  paidAt: new Date('2026-10-04T00:00:00.000Z'),
  items: [item()],
  ...overrides,
});

describe('주문 생성 입력 검증', () => {
  it('규칙에 맞는 입력이면 모든 필드를 유지한 CreateOrderInput으로 변환한다', async () => {
    const result = (await validate(input())) as CreateOrderInput;

    expect(result).toBeInstanceOf(CreateOrderInput);
    expect(result).toEqual(input());
  });

  it('요청사항이 없으면 통과한다', async () => {
    await expect(validate(input({ request: null }))).resolves.toBeDefined();
    await expect(validate(input({ request: undefined }))).resolves.toBeDefined();
  });

  it('같은 skuId가 여러 번 와도 통과한다', async () => {
    await expect(
      validate(input({ items: [item(), item()] })),
    ).resolves.toBeDefined();
  });

  it.each([
    ['cartId가 비어 있으면', { cartId: '' }],
    ['cartId가 64자를 넘으면', { cartId: 'c'.repeat(65) }],
    ['항목이 없으면', { items: [] }],
    ['항목이 50개를 넘으면', { items: Array.from({ length: 51 }, () => item()) }],
    ['총액이 음수이면', { amount: -1 }],
    ['요청사항이 100자를 넘으면', { request: '가'.repeat(101) }],
    ['수량이 0이면', { items: [item({ quantity: 0 })] }],
    ['수량이 99를 넘으면', { items: [item({ quantity: 100 })] }],
    ['단가가 음수이면', { items: [item({ price: -1 })] }],
    ['상품명이 비어 있으면', { items: [item({ productName: '' })] }],
    ['SKU명이 100자를 넘으면', { items: [item({ skuName: 'k'.repeat(101) })] }],
  ])('%s 입력 오류를 반환한다', async (_, overrides) => {
    await expect(validate(input(overrides))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `yarn test test/orders/orders.input.spec.ts`
Expected: FAIL — `Cannot find module '../../src/orders/orders.types'`.

- [ ] **Step 3: `src/orders/orders.types.ts` 작성**

```ts
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
```

- [ ] **Step 4: 통과 확인**

Run: `yarn test test/orders/orders.input.spec.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/orders/orders.types.ts test/orders/orders.input.spec.ts
git commit -m "feat(orders): add order GraphQL types and create input validation"
```

---

### Task 3: 주문 목록·상세 조회 서비스

**Files:**
- Create: `src/orders/orders.service.ts`
- Modify: `src/common/pagination.ts`
- Test: `test/orders/orders.service.spec.ts`, `test/common/pagination.spec.ts`

**Interfaces:**
- Consumes: `validateId` (`src/common/validation.ts`), `validateSize`, `encodeCursor`, `decodeCursor`, `slicePage` (Task 1), `OrderType`, `OrderItemType`, `OrderPage` (Task 2).
- Produces:
  - `CursorKind`에 `'orders'` 추가. 날짜 키 검증은 `'new'`와 `'orders'`에 적용한다.
  - `OrdersService.findOrders(userId: number, size = 20, cursor?: string | null): Promise<OrderPage>`
  - `OrdersService.findOrder(userId: number, id: string): Promise<OrderType | null>`
  - 내부 `OrdersService.loadOrder(userId: number, id: number): Promise<OrderType | null>` — Task 4가 사용한다(`private`).

- [ ] **Step 1: 커서 테스트 추가 (실패 상태)**

`test/common/pagination.spec.ts`의 `describe` 안에 추가:

```ts
  it('주문 커서를 같은 사용자가 쓰면 생성 시각과 ID를 복원하고 다른 사용자가 쓰면 거부한다', () => {
    const key = '2026-10-04T01:02:03.123456Z';
    const cursor = encodeCursor('orders', '7', key, ID);

    expect(decodeCursor('orders', '7', cursor)).toEqual({ key, id: ID });
    expect(() => decodeCursor('orders', '8', cursor)).toThrow(
      BadRequestException,
    );
    expect(() =>
      decodeCursor('orders', '7', encodeCursor('orders', '7', 'not-a-date', ID)),
    ).toThrow(BadRequestException);
  });
```

- [ ] **Step 2: 서비스 조회 테스트 작성 (실패 상태)**

`test/orders/orders.service.spec.ts`:

```ts
import type { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException } from '@nestjs/common';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { OrdersService } from '../../src/orders/orders.service';

const USER = 7;
const createdAt = new Date('2026-10-04T01:00:00.000Z');
const paidAt = new Date('2026-10-04T00:59:00.000Z');

const orderRow = (id: number, cursorCreatedAt = '2026-10-04T01:00:00.123456Z') => ({
  id,
  store_id: 1,
  store_name: '브루랩 강남점',
  prefix_order_number: 'A',
  order_number: id,
  amount: 8000,
  request: null,
  paid_at: paidAt,
  created_at: createdAt,
  cursor_created_at: cursorCreatedAt,
});

const itemRow = (id: number, orderId: number) => ({
  id,
  order_id: orderId,
  product_id: 10,
  sku_id: 100,
  product_name: '아메리카노',
  sku_name: 'ICE',
  price: 4000,
  quantity: 2,
});

describe('OrdersService 조회', () => {
  const execute = jest.fn<Promise<unknown[]>, [string, unknown[]]>();
  const service = new OrdersService({ execute } as unknown as EntityManager);

  beforeEach(() => execute.mockReset());

  it('주문이 없는 사용자의 목록을 조회하면 빈 목록을 반환하고 항목을 조회하지 않는다', async () => {
    execute.mockResolvedValueOnce([]);

    await expect(service.findOrders(USER, 20, null)).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('목록을 조회하면 본인 주문을 최신순으로 가져오고 항목을 주문별로 묶는다', async () => {
    execute
      .mockResolvedValueOnce([orderRow(3), orderRow(2)])
      .mockResolvedValueOnce([itemRow(31, 3), itemRow(21, 2), itemRow(32, 3)]);

    const page = await service.findOrders(USER, 20, null);

    expect(execute.mock.calls[0][0]).toContain('FROM "order"');
    expect(execute.mock.calls[0][0]).toContain('user_id = ?');
    expect(execute.mock.calls[0][0]).toContain(
      'ORDER BY created_at DESC, id DESC',
    );
    expect(execute.mock.calls[0][1]).toEqual([USER, 21]);
    expect(execute.mock.calls[1][0]).toContain('order_id IN (?, ?)');
    expect(execute.mock.calls[1][0]).toContain('ORDER BY id ASC');
    expect(execute.mock.calls[1][1]).toEqual([3, 2]);
    expect(page.nextCursor).toBeNull();
    expect(page.items).toEqual([
      {
        id: 3,
        storeId: 1,
        storeName: '브루랩 강남점',
        prefixOrderNumber: 'A',
        orderNumber: 3,
        amount: 8000,
        request: null,
        paidAt,
        createdAt,
        items: [
          {
            id: 31,
            productId: 10,
            skuId: 100,
            productName: '아메리카노',
            skuName: 'ICE',
            price: 4000,
            quantity: 2,
          },
          {
            id: 32,
            productId: 10,
            skuId: 100,
            productName: '아메리카노',
            skuName: 'ICE',
            price: 4000,
            quantity: 2,
          },
        ],
      },
      expect.objectContaining({ id: 2, items: [expect.objectContaining({ id: 21 })] }),
    ]);
  });

  it('같은 시각의 주문이 페이지 경계에 걸리면 마이크로초 시각과 ID로 다음 페이지를 이어 조회한다', async () => {
    execute
      .mockResolvedValueOnce([orderRow(3), orderRow(2)])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([orderRow(1)])
      .mockResolvedValueOnce([]);

    const first = await service.findOrders(USER, 1, null);
    expect(first.items.map(({ id }) => id)).toEqual([3]);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = await service.findOrders(USER, 1, first.nextCursor);
    expect(second.items.map(({ id }) => id)).toEqual([1]);
    expect(execute.mock.calls[0][0]).toContain('cursor_created_at');
    expect(execute.mock.calls[2][0]).toContain(
      '(created_at, id) < (?::timestamptz, ?::integer)',
    );
    expect(execute.mock.calls[2][1]).toEqual([
      USER,
      '2026-10-04T01:00:00.123456Z',
      3,
      2,
    ]);
  });

  it('다른 사용자의 커서로 목록을 조회하면 입력 오류를 반환한다', async () => {
    execute
      .mockResolvedValueOnce([orderRow(3), orderRow(2)])
      .mockResolvedValueOnce([]);
    const page = await service.findOrders(USER, 1, null);

    await expect(
      service.findOrders(USER + 1, 1, page.nextCursor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('페이지 크기가 범위를 벗어나면 조회 없이 입력 오류를 반환한다', async () => {
    await expect(service.findOrders(USER, 0, null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('본인 주문이 아니거나 없는 주문을 상세 조회하면 null을 반환한다', async () => {
    execute.mockResolvedValueOnce([]);

    await expect(service.findOrder(USER, '5')).resolves.toBeNull();
    expect(execute.mock.calls[0][0]).toContain('id = ? AND user_id = ?');
    expect(execute.mock.calls[0][1]).toEqual([5, USER]);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('본인 주문을 상세 조회하면 항목을 포함해 반환한다', async () => {
    execute
      .mockResolvedValueOnce([orderRow(5)])
      .mockResolvedValueOnce([itemRow(51, 5)]);

    const order = await service.findOrder(USER, '5');

    expect(order).toMatchObject({ id: 5, orderNumber: 5, items: [{ id: 51 }] });
  });

  it('주문 ID 형식이 잘못되면 조회 없이 입력 오류를 반환한다', async () => {
    await expect(service.findOrder(USER, 'abc')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(execute).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `yarn test test/common/pagination.spec.ts test/orders/orders.service.spec.ts`
Expected: FAIL — `'orders'`가 `CursorKind`에 없다는 타입 오류, `Cannot find module '../../src/orders/orders.service'`.

- [ ] **Step 4: `src/common/pagination.ts`에 `'orders'` 추가**

```ts
export type CursorKind =
  | 'nearby'
  | 'new'
  | 'store-search'
  | 'menu-search'
  | 'orders';
```

`decodeCursor`의 날짜 키 검증 조건을 변경:

```ts
    if (kind === 'new' || kind === 'orders') {
```

- [ ] **Step 5: `src/orders/orders.service.ts` 작성 (조회 부분)**

```ts
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import {
  decodeCursor,
  encodeCursor,
  slicePage,
  validateSize,
} from '../common/pagination';
import { validateId } from '../common/validation';
import { OrderItemType, OrderPage, OrderType } from './orders.types';

type OrderRow = {
  id: number;
  store_id: number;
  store_name: string;
  prefix_order_number: string;
  order_number: number;
  amount: number;
  request: string | null;
  paid_at: Date | string;
  created_at: Date | string;
  cursor_created_at: string;
};

type OrderItemRow = {
  id: number;
  order_id: number;
  product_id: number;
  sku_id: number;
  product_name: string;
  sku_name: string;
  price: number;
  quantity: number;
};

// cursor_created_at은 커서가 마이크로초까지 보존하도록 DB에서 문자열로 만든다.
const ORDER_COLUMNS = `id, store_id, store_name, prefix_order_number, order_number,
  amount, request, paid_at, created_at,
  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_created_at`;

@Injectable()
export class OrdersService {
  constructor(private readonly em: EntityManager) {}

  async findOrders(
    userId: number,
    size = 20,
    cursor?: string | null,
  ): Promise<OrderPage> {
    validateSize(size);
    const scope = String(userId);
    const start = decodeCursor('orders', scope, cursor);
    const rows = await this.em.execute<OrderRow[]>(
      `SELECT ${ORDER_COLUMNS} FROM "order" WHERE user_id = ?
      ${start ? 'AND (created_at, id) < (?::timestamptz, ?::integer)' : ''}
      ORDER BY created_at DESC, id DESC LIMIT ?`,
      [userId, ...(start ? [start.key, start.id] : []), size + 1],
    );
    const page = slicePage(rows, size, (row) =>
      encodeCursor('orders', scope, row.cursor_created_at, row.id),
    );
    return {
      items: await this.withItems(page.items),
      nextCursor: page.nextCursor,
    };
  }

  async findOrder(userId: number, id: string): Promise<OrderType | null> {
    return this.loadOrder(userId, validateId(id));
  }

  private async loadOrder(
    userId: number,
    id: number,
  ): Promise<OrderType | null> {
    const rows = await this.em.execute<OrderRow[]>(
      `SELECT ${ORDER_COLUMNS} FROM "order" WHERE id = ? AND user_id = ?`,
      [id, userId],
    );
    return (await this.withItems(rows))[0] ?? null;
  }

  // 주문 수와 관계없이 항목은 한 번에 조회한다.
  private async withItems(rows: OrderRow[]): Promise<OrderType[]> {
    if (rows.length === 0) return [];
    const itemRows = await this.em.execute<OrderItemRow[]>(
      `SELECT id, order_id, product_id, sku_id, product_name, sku_name, price, quantity
       FROM order_item WHERE order_id IN (${rows.map(() => '?').join(', ')})
       ORDER BY id ASC`,
      rows.map(({ id }) => id),
    );
    const items = new Map<number, OrderItemType[]>();
    for (const row of itemRows) {
      const list = items.get(row.order_id) ?? [];
      list.push({
        id: row.id,
        productId: row.product_id,
        skuId: row.sku_id,
        productName: row.product_name,
        skuName: row.sku_name,
        price: row.price,
        quantity: row.quantity,
      });
      items.set(row.order_id, list);
    }
    return rows.map((row) => ({
      id: row.id,
      storeId: row.store_id,
      storeName: row.store_name,
      prefixOrderNumber: row.prefix_order_number,
      orderNumber: row.order_number,
      amount: row.amount,
      request: row.request,
      paidAt: new Date(row.paid_at),
      createdAt: new Date(row.created_at),
      items: items.get(row.id) ?? [],
    }));
  }
}
```

- [ ] **Step 6: 통과 확인**

Run: `yarn test test/common/pagination.spec.ts test/orders/orders.service.spec.ts`
Expected: PASS.

- [ ] **Step 7: 커밋**

```bash
git add src/common/pagination.ts src/orders/orders.service.ts test/common/pagination.spec.ts test/orders/orders.service.spec.ts
git commit -m "feat(orders): query own orders with cursor pagination"
```

---

### Task 4: 주문 생성

**Files:**
- Modify: `src/orders/orders.service.ts`
- Test: `test/orders/orders.create.spec.ts` (신규)

**Interfaces:**
- Consumes: `CreateOrderInput` (Task 2), `OrdersService.loadOrder` (Task 3, private), `validateId`.
- Produces: `OrdersService.createOrder(userId: number, input: CreateOrderInput): Promise<OrderType>`

조회 테스트와 mock 구성이 달라서(`transactional` 필요) 별도 파일로 둔다. 행 생성 헬퍼는 테스트 파일 사이 import를 피하려고 이 파일에서 다시 정의한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`test/orders/orders.create.spec.ts`:

```ts
import type { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException } from '@nestjs/common';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { OrdersService } from '../../src/orders/orders.service';
import type { CreateOrderInput } from '../../src/orders/orders.types';

const USER = 7;
const paidAt = new Date('2026-10-04T00:59:00.000Z');

const orderRow = (id: number, orderNumber: number) => ({
  id,
  store_id: 1,
  store_name: '브루랩 강남점',
  prefix_order_number: 'A',
  order_number: orderNumber,
  amount: 12500,
  request: null,
  paid_at: paidAt,
  created_at: paidAt,
  cursor_created_at: '2026-10-04T00:59:00.000000Z',
});

const input = (overrides: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
  cartId: 'cart-1',
  storeId: '1',
  amount: 12500,
  request: '',
  paidAt,
  items: [
    {
      productId: '10',
      skuId: '100',
      productName: '아메리카노',
      skuName: 'ICE',
      price: 4000,
      quantity: 2,
    },
    {
      productId: '11',
      skuId: '110',
      productName: '카페라떼',
      skuName: 'HOT',
      price: 4500,
      quantity: 1,
    },
  ],
  ...overrides,
});

describe('OrdersService 주문 생성', () => {
  const execute = jest.fn<Promise<unknown[]>, [string, unknown[]]>();
  const txExecute = jest.fn<Promise<unknown[]>, [string, unknown[]]>();
  const transactional = jest.fn(
    (callback: (em: { execute: typeof txExecute }) => Promise<unknown>) =>
      callback({ execute: txExecute }),
  );
  const service = new OrdersService({
    execute,
    transactional,
  } as unknown as EntityManager);

  beforeEach(() => {
    execute.mockReset();
    txExecute.mockReset();
    transactional.mockClear();
  });

  const mockNewOrder = () => {
    execute
      .mockResolvedValueOnce([]) // cartId 조회
      .mockResolvedValueOnce([{ name: '브루랩 강남점' }]) // 매장 조회
      .mockResolvedValueOnce([orderRow(9, 3)]) // 생성 후 주문 조회
      .mockResolvedValueOnce([]); // 생성 후 항목 조회
    txExecute
      .mockResolvedValueOnce([{ last_number: 3, order_date: '2026-10-04' }])
      .mockResolvedValueOnce([{ id: 9 }])
      .mockResolvedValueOnce([]);
  };

  it('정상 입력이면 한 트랜잭션에서 주문번호를 받고 주문과 항목을 저장한다', async () => {
    mockNewOrder();

    const order = await service.createOrder(USER, input());

    expect(transactional).toHaveBeenCalledTimes(1);
    const [counterSql, counterParams] = txExecute.mock.calls[0];
    expect(counterSql).toContain('INSERT INTO order_number_counter');
    expect(counterSql).toContain("(now() AT TIME ZONE 'Asia/Seoul')::date");
    expect(counterSql).toContain('ON CONFLICT (store_id, order_date)');
    expect(counterSql).toContain(
      'last_number = order_number_counter.last_number + 1',
    );
    expect(counterSql).toContain('order_date::text AS order_date');
    expect(counterParams).toEqual([1]);

    const [orderSql, orderParams] = txExecute.mock.calls[1];
    expect(orderSql).toContain('INSERT INTO "order"');
    expect(orderSql).toContain('RETURNING id');
    expect(orderParams).toEqual([
      USER,
      1,
      '브루랩 강남점',
      'cart-1',
      '2026-10-04',
      'A',
      3,
      12500,
      null,
      paidAt,
    ]);

    const [itemSql, itemParams] = txExecute.mock.calls[2];
    expect(itemSql).toContain('INSERT INTO order_item');
    expect(itemSql).toContain(
      'VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)',
    );
    expect(itemParams).toEqual([
      9, 10, 100, '아메리카노', 'ICE', 4000, 2,
      9, 11, 110, '카페라떼', 'HOT', 4500, 1,
    ]);

    expect(order).toMatchObject({ id: 9, prefixOrderNumber: 'A', orderNumber: 3 });
  });

  it('요청사항이 비어 있으면 null로 저장하고 내용이 있으면 그대로 저장한다', async () => {
    mockNewOrder();
    await service.createOrder(USER, input({ request: '' }));
    expect(txExecute.mock.calls[1][1][8]).toBeNull();

    mockNewOrder();
    await service.createOrder(USER, input({ request: '빨대 주세요.' }));
    expect(txExecute.mock.calls[4][1][8]).toBe('빨대 주세요.');
  });

  it('매장명은 클라이언트가 아니라 DB에서 가져오고 비활성이거나 영업 종료인 매장도 거절하지 않는다', async () => {
    mockNewOrder();

    await service.createOrder(USER, input());

    const [storeSql, storeParams] = execute.mock.calls[1];
    expect(storeSql).toBe('SELECT name FROM store WHERE id = ?');
    expect(storeSql).not.toContain('is_active');
    expect(storeSql).not.toContain('is_open');
    expect(storeParams).toEqual([1]);
  });

  it('같은 사용자의 같은 cartId 주문이 이미 있으면 새로 만들지 않고 기존 주문을 반환한다', async () => {
    execute
      .mockResolvedValueOnce([{ id: 4 }])
      .mockResolvedValueOnce([orderRow(4, 1)])
      .mockResolvedValueOnce([]);

    const order = await service.createOrder(USER, input());

    expect(execute.mock.calls[0][0]).toBe(
      'SELECT id FROM "order" WHERE user_id = ? AND cart_id = ?',
    );
    expect(execute.mock.calls[0][1]).toEqual([USER, 'cart-1']);
    expect(transactional).not.toHaveBeenCalled();
    expect(order).toMatchObject({ id: 4, orderNumber: 1 });
  });

  it('매장이 없으면 주문을 만들지 않고 Store not found 입력 오류를 반환한다', async () => {
    execute.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await expect(service.createOrder(USER, input())).rejects.toThrow(
      new BadRequestException('Store not found'),
    );
    expect(transactional).not.toHaveBeenCalled();
  });

  it('ID 형식이 잘못되면 DB 조회 없이 입력 오류를 반환한다', async () => {
    await expect(
      service.createOrder(USER, input({ storeId: 'abc' })),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createOrder(
        USER,
        input({
          items: [{ ...input().items[0], skuId: '0' }],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(execute).not.toHaveBeenCalled();
  });

  it('같은 cartId 요청이 동시에 들어와 unique 제약에 걸리면 먼저 저장된 주문을 반환한다', async () => {
    execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ name: '브루랩 강남점' }])
      .mockResolvedValueOnce([{ id: 4 }])
      .mockResolvedValueOnce([orderRow(4, 1)])
      .mockResolvedValueOnce([]);
    transactional.mockRejectedValueOnce(
      Object.assign(new Error('duplicate'), {
        code: '23505',
        constraint: 'order_user_id_cart_id_unique',
      }),
    );

    const order = await service.createOrder(USER, input());

    expect(execute.mock.calls[2][1]).toEqual([USER, 'cart-1']);
    expect(order).toMatchObject({ id: 4 });
  });

  it('cartId 중복이 아닌 DB 오류가 나면 그대로 던진다', async () => {
    execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ name: '브루랩 강남점' }]);
    const error = Object.assign(new Error('duplicate number'), {
      code: '23505',
      constraint: 'order_store_id_order_date_number_unique',
    });
    transactional.mockRejectedValueOnce(error);

    await expect(service.createOrder(USER, input())).rejects.toBe(error);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `yarn test test/orders/orders.create.spec.ts`
Expected: FAIL — `service.createOrder is not a function`.

- [ ] **Step 3: `createOrder` 구현**

`src/orders/orders.service.ts`를 수정한다.

import 변경:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
```

```ts
import {
  CreateOrderInput,
  OrderItemType,
  OrderPage,
  OrderType,
} from './orders.types';
```

`ORDER_COLUMNS` 아래에 추가:

```ts
const ORDER_NUMBER_PREFIX = 'A';

function isCartIdUniqueViolation(error: unknown): boolean {
  const databaseError = error as { code?: string; constraint?: string } | null;
  return (
    databaseError?.code === '23505' &&
    databaseError.constraint === 'order_user_id_cart_id_unique'
  );
}
```

클래스 안 `findOrders` 위에 추가:

```ts
  // 결제가 끝난 장바구니를 기록한다. 가격·품절·영업 여부는 결제 전 단계의 책임이다.
  async createOrder(
    userId: number,
    input: CreateOrderInput,
  ): Promise<OrderType> {
    const storeId = validateId(input.storeId);
    const items = input.items.map((item) => ({
      ...item,
      productId: validateId(item.productId),
      skuId: validateId(item.skuId),
    }));

    const existingId = await this.findIdByCartId(userId, input.cartId);
    if (existingId) return (await this.loadOrder(userId, existingId))!;

    const [store] = await this.em.execute<{ name: string }[]>(
      'SELECT name FROM store WHERE id = ?',
      [storeId],
    );
    if (!store) throw new BadRequestException('Store not found');

    let orderId: number;
    try {
      orderId = await this.em.transactional(async (em) => {
        // (매장, 주문일) 행 락으로 같은 매장 주문을 직렬화한다.
        const [counter] = await em.execute<
          { last_number: number; order_date: string }[]
        >(
          `INSERT INTO order_number_counter (store_id, order_date, last_number)
           VALUES (?, (now() AT TIME ZONE 'Asia/Seoul')::date, 1)
           ON CONFLICT (store_id, order_date)
           DO UPDATE SET last_number = order_number_counter.last_number + 1
           RETURNING last_number, order_date::text AS order_date`,
          [storeId],
        );
        const [order] = await em.execute<{ id: number }[]>(
          `INSERT INTO "order" (user_id, store_id, store_name, cart_id, order_date,
             prefix_order_number, order_number, amount, request, paid_at)
           VALUES (?, ?, ?, ?, ?::date, ?, ?, ?, ?, ?)
           RETURNING id`,
          [
            userId,
            storeId,
            store.name,
            input.cartId,
            counter.order_date,
            ORDER_NUMBER_PREFIX,
            counter.last_number,
            input.amount,
            input.request || null,
            input.paidAt,
          ],
        );
        await em.execute(
          `INSERT INTO order_item (order_id, product_id, sku_id, product_name, sku_name, price, quantity)
           VALUES ${items.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
          items.flatMap((item) => [
            order.id,
            item.productId,
            item.skuId,
            item.productName,
            item.skuName,
            item.price,
            item.quantity,
          ]),
        );
        return order.id;
      });
    } catch (error) {
      // 같은 cartId 요청이 동시에 들어오면 늦은 쪽이 롤백되고 먼저 저장된 주문을 반환한다.
      if (!isCartIdUniqueViolation(error)) throw error;
      const id = await this.findIdByCartId(userId, input.cartId);
      if (!id) throw error;
      orderId = id;
    }
    return (await this.loadOrder(userId, orderId))!;
  }
```

`loadOrder` 위에 추가:

```ts
  private async findIdByCartId(
    userId: number,
    cartId: string,
  ): Promise<number | null> {
    const [row] = await this.em.execute<{ id: number }[]>(
      'SELECT id FROM "order" WHERE user_id = ? AND cart_id = ?',
      [userId, cartId],
    );
    return row?.id ?? null;
  }
```

- [ ] **Step 4: 통과 확인**

Run: `yarn test test/orders`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/orders/orders.service.ts test/orders/orders.create.spec.ts
git commit -m "feat(orders): create orders with per-store daily numbers and cartId dedupe"
```

---

### Task 5: Resolver, 모듈 등록, 스키마

**Files:**
- Create: `src/orders/orders.resolver.ts`, `src/orders/orders.module.ts`
- Modify: `src/app.module.ts`, `schema.gql`
- Test: `test/orders/orders.resolver.spec.ts`, `test/orders/orders.graphql.spec.ts`, `test/app.module.spec.ts`

**Interfaces:**
- Consumes: `OrdersService.createOrder/findOrders/findOrder` (Task 3, 4), `CreateOrderInput`, `OrderType`, `OrderPage` (Task 2), `AuthenticatedRequest` (`src/auth/auth.guard.ts`, 기존).
- Produces: GraphQL `Mutation.createOrder(input: CreateOrderInput!): Order!`, `Query.orders(size: Int = 20, cursor: String): OrderPage!`, `Query.order(id: ID!): Order`, `OrdersModule`.

- [ ] **Step 1: 실패하는 테스트 작성**

`test/orders/orders.resolver.spec.ts`:

```ts
jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import type { AuthenticatedRequest } from '../../src/auth/auth.guard';
import { OrdersResolver } from '../../src/orders/orders.resolver';
import type { OrdersService } from '../../src/orders/orders.service';
import type { CreateOrderInput } from '../../src/orders/orders.types';

const req = { userId: 7 } as AuthenticatedRequest;

describe('OrdersResolver', () => {
  it('주문을 생성하면 토큰의 사용자 ID로 서비스를 호출한다', async () => {
    const order = { id: 1 };
    const createOrder = jest.fn().mockResolvedValue(order);
    const resolver = new OrdersResolver({
      createOrder,
    } as unknown as OrdersService);
    const input = { cartId: 'cart-1' } as CreateOrderInput;

    await expect(resolver.createOrder(input, req)).resolves.toBe(order);
    expect(createOrder).toHaveBeenCalledWith(7, input);
  });

  it('주문 목록을 요청하면 토큰의 사용자 ID와 페이지 인자를 전달한다', async () => {
    const page = { items: [], nextCursor: null };
    const findOrders = jest.fn().mockResolvedValue(page);
    const resolver = new OrdersResolver({
      findOrders,
    } as unknown as OrdersService);

    await expect(resolver.orders(req, 10, 'cursor')).resolves.toBe(page);
    expect(findOrders).toHaveBeenCalledWith(7, 10, 'cursor');
  });

  it('주문 상세를 요청하면 토큰의 사용자 ID와 주문 ID를 전달한다', async () => {
    const findOrder = jest.fn().mockResolvedValue(null);
    const resolver = new OrdersResolver({
      findOrder,
    } as unknown as OrdersService);

    await expect(resolver.order('5', req)).resolves.toBeNull();
    expect(findOrder).toHaveBeenCalledWith(7, '5');
  });
});
```

`test/orders/orders.graphql.spec.ts`:

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

import { OrdersResolver } from '../../src/orders/orders.resolver';

describe('주문 GraphQL 스키마', () => {
  it('주문 resolver를 구성하면 생성·목록·상세 API와 타입이 스키마에 표시된다', async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();
    const schema = await module
      .get(GraphQLSchemaFactory)
      .create([OrdersResolver]);

    expect(Object.keys(schema.getQueryType()?.getFields() ?? {})).toEqual([
      'orders',
      'order',
    ]);
    expect(Object.keys(schema.getMutationType()?.getFields() ?? {})).toEqual([
      'createOrder',
    ]);
    const sdl = printSchema(schema);
    expect(sdl).toContain('createOrder(input: CreateOrderInput!): Order!');
    expect(sdl).toContain('orders(size: Int = 20, cursor: String): OrderPage!');
    expect(sdl).toContain('order(id: ID!): Order');
    expect(sdl).toContain('prefixOrderNumber: String!');
    expect(sdl).toContain('orderNumber: Int!');
    expect(sdl).toContain('storeName: String!');
    expect(sdl).toContain('paidAt: DateTime!');
    expect(sdl).toContain('items: [OrderItem!]!');
    expect(sdl).toContain('items: [OrderItemInput!]!');
    expect(sdl).toContain('request: String');
    expect(sdl).not.toContain('updatedAt');
    await module.close();
  });
});
```

`test/app.module.spec.ts` 수정:
- `afterEach`에 `jest.dontMock('../src/orders/orders.module');` 추가.
- `class MockProductsModule {}` 아래에 `class MockOrdersModule {}` 추가.
- products mock 아래에 추가:

```ts
      jest.doMock('../src/orders/orders.module', () => ({
        OrdersModule: MockOrdersModule,
      }));
```

- `expect(imports).toEqual(expect.arrayContaining([...]))` 배열에 `MockOrdersModule` 추가.

- [ ] **Step 2: 실패 확인**

Run: `yarn test test/orders test/app.module.spec.ts`
Expected: FAIL — `Cannot find module '../../src/orders/orders.resolver'`, `'../src/orders/orders.module'`.

- [ ] **Step 3: resolver와 module 작성**

`src/orders/orders.resolver.ts`:

```ts
import { Args, Context, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import type { AuthenticatedRequest } from '../auth/auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderInput, OrderPage, OrderType } from './orders.types';

@Resolver()
export class OrdersResolver {
  constructor(private readonly service: OrdersService) {}

  @Mutation(() => OrderType)
  createOrder(
    @Args('input') input: CreateOrderInput,
    @Context('req') req: AuthenticatedRequest,
  ) {
    return this.service.createOrder(req.userId, input);
  }

  @Query(() => OrderPage)
  orders(
    @Context('req') req: AuthenticatedRequest,
    @Args('size', { type: () => Int, nullable: true, defaultValue: 20 })
    size: number,
    @Args('cursor', { type: () => String, nullable: true })
    cursor?: string | null,
  ) {
    return this.service.findOrders(req.userId, size, cursor);
  }

  @Query(() => OrderType, { nullable: true })
  order(
    @Args('id', { type: () => ID }) id: string,
    @Context('req') req: AuthenticatedRequest,
  ) {
    return this.service.findOrder(req.userId, id);
  }
}
```

`src/orders/orders.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { OrdersResolver } from './orders.resolver';
import { OrdersService } from './orders.service';

// 엔티티 없이 raw SQL만 쓰므로 forFeature가 필요 없다. EntityManager는 MikroOrmModule이 전역으로 제공한다.
@Module({
  providers: [OrdersService, OrdersResolver],
})
export class OrdersModule {}
```

`src/app.module.ts`: `import { OrdersModule } from './orders/orders.module';`를 추가하고, `imports` 배열의 `PromotionsModule,` 다음에 `OrdersModule,`을 추가한다.

- [ ] **Step 4: 통과 확인**

Run: `yarn test`
Expected: 전부 PASS.

Run: `yarn lint && yarn build`
Expected: 오류 없음.

- [ ] **Step 5: schema.gql 재생성**

`environments/.env`의 `DATABASE_URL`에 접속할 수 있는 상태에서:

Run: `yarn start` → `Nest application successfully started` 로그를 확인한 뒤 종료(Ctrl+C).
Expected: `git diff schema.gql`에 `CreateOrderInput`, `Order`, `OrderItem`, `OrderItemInput`, `OrderPage` 타입, `createOrder` mutation, `orders`/`order` query만 추가된다. 부팅 로그에 `EntityManager` 주입 오류가 없어야 한다.

DB에 접속할 수 없어 부팅이 실패하면 이 단계를 건너뛰고 결과 보고에 "schema.gql 미갱신"을 명시한다.

- [ ] **Step 6: graphify 갱신과 커밋**

Run: `graphify update .`

```bash
git add src/orders src/app.module.ts test/orders test/app.module.spec.ts schema.gql graphify-out
git commit -m "feat(orders): expose createOrder, orders and order GraphQL APIs"
```

---

### Task 6: 실제 DB 동시성 통합 테스트

**Files:**
- Create: `test/orders/orders.integration-spec.ts`

**Interfaces:**
- Consumes: `AppModule`, `OrdersService.createOrder` (Task 4–5), `EntityManager`.
- Produces: 없음(검증 전용).

전제: `TEST_DATABASE_URL`이 가리키는 DB에 spec의 DDL(`"order"`, `order_item`, `order_number_counter`)과 기존 `store` 테이블이 있어야 한다. 테스트는 매장 행을 직접 만들고 끝나면 관련 행을 모두 지운다.

- [ ] **Step 1: 통합 테스트 작성**

`test/orders/orders.integration-spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';

import { AppModule } from '../../src/app.module';
import { OrdersService } from '../../src/orders/orders.service';
import type { CreateOrderInput } from '../../src/orders/orders.types';

// user 테이블과 외래 키가 없으므로 실제 사용자와 겹치지 않을 큰 ID를 쓴다.
const USER_A = 2000000001;
const USER_B = 2000000002;

describe('주문 생성 동시성', () => {
  let testingModule: TestingModule;
  let em: EntityManager;
  let service: OrdersService;
  let storeId: number;

  const input = (cartId: string): CreateOrderInput => ({
    cartId,
    storeId: String(storeId),
    amount: 4000,
    request: null,
    paidAt: new Date(),
    items: [
      {
        productId: '1',
        skuId: '1',
        productName: '아메리카노',
        skuName: 'ICE',
        price: 4000,
        quantity: 1,
      },
    ],
  });

  beforeAll(async () => {
    process.env.OTP_HMAC_SECRET = 'integration-test-hmac-secret';
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    em = testingModule.get(EntityManager);
    service = testingModule.get(OrdersService);
    const [store] = await em.execute<{ id: number }[]>(
      `INSERT INTO store (name, category, address, latitude, longitude, created_at, updated_at)
       VALUES ('동시성 테스트 매장', '카페', '서울', 37.5, 127, now(), now())
       RETURNING id`,
    );
    storeId = store.id;
  });

  afterAll(async () => {
    if (storeId) {
      await em.execute(
        'DELETE FROM order_item WHERE order_id IN (SELECT id FROM "order" WHERE store_id = ?)',
        [storeId],
      );
      await em.execute('DELETE FROM "order" WHERE store_id = ?', [storeId]);
      await em.execute('DELETE FROM order_number_counter WHERE store_id = ?', [
        storeId,
      ]);
      await em.execute('DELETE FROM store WHERE id = ?', [storeId]);
    }
    await testingModule?.close();
  });

  it('같은 매장에 동시에 10건을 주문하면 주문번호를 1부터 10까지 중복 없이 부여한다', async () => {
    const startedAt = performance.now();
    const orders = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        service.createOrder(USER_A, input(`concurrent-${storeId}-${i}`)),
      ),
    );
    console.log(
      `동시 주문 10건 소요 시간: ${Math.round(performance.now() - startedAt)}ms`,
    );

    expect(orders.map((order) => order.orderNumber).sort((a, b) => a - b)).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    );
    expect(new Set(orders.map((order) => order.id)).size).toBe(10);
  });

  it('같은 cartId로 동시에 2건을 보내면 주문을 하나만 만들고 진 쪽은 주문번호를 소모하지 않는다', async () => {
    const cartId = `same-cart-${storeId}`;
    const [first, second] = await Promise.all([
      service.createOrder(USER_B, input(cartId)),
      service.createOrder(USER_B, input(cartId)),
    ]);

    expect(first.id).toBe(second.id);
    const [{ count }] = await em.execute<{ count: string }[]>(
      'SELECT count(*) FROM "order" WHERE user_id = ? AND cart_id = ?',
      [USER_B, cartId],
    );
    expect(Number(count)).toBe(1);

    const next = await service.createOrder(USER_B, input(`after-${storeId}`));
    expect(next.orderNumber).toBe(first.orderNumber + 1);
  });

  it('다른 사용자가 같은 cartId를 쓰면 각자 별도 주문을 만든다', async () => {
    const cartId = `shared-cart-${storeId}`;
    const a = await service.createOrder(USER_A, input(cartId));
    const b = await service.createOrder(USER_B, input(cartId));

    expect(a.id).not.toBe(b.id);
    await expect(service.findOrder(USER_B, String(a.id))).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: 통합 테스트 실행**

Run: `TEST_DATABASE_URL=<테스트 DB URL> yarn test:integration test/orders`
Expected: PASS 3건, 그리고 `동시 주문 10건 소요 시간: <N>ms` 로그.

`TEST_DATABASE_URL`이 없거나 테스트 DB에 DDL이 적용되지 않았으면 실행하지 않는다. 결과 보고에 "통합 테스트 미실행 — DDL 적용 후 실행 필요"를 명시한다.

실패하면 다음 순서로 확인한다.
- 두 번째 테스트에서 unique 위반이 `createOrder` 밖으로 새어 나오는 경우: MikroORM이 감싼 오류에 `code`, `constraint`가 남는지 확인한다(`console.log(Object.keys(error))`). 다른 이름이면 `isCartIdUniqueViolation`을 그 속성에 맞추고 Task 4의 단위 테스트 mock도 같은 모양으로 고친다.
- 주문번호가 중복되는 경우: `em.transactional` 콜백 안에서 `em.execute`가 같은 트랜잭션 커넥션을 쓰는지 확인한다.

- [ ] **Step 3: 커밋**

```bash
git add test/orders/orders.integration-spec.ts
git commit -m "test(orders): verify concurrent order numbering and cartId dedupe on PostgreSQL"
```

---

## 완료 후 보고에 포함할 것

- 테스트 DB와 실제 DB에 적용할 DDL (spec의 "데이터 스키마" 그대로).
- 샘플 데이터 SQL: 기존 샘플 매장 하나에 주문 2건(항목 2개, 1개)과 해당 `order_number_counter` 행.
- `schema.gql` 갱신 여부, 통합 테스트 실행 여부와 측정한 동시 주문 소요 시간.
- 클라이언트 영향: 기존 `stores`, `newStores`, `search.stores`, `search.menus`의 인자가 `first`/`after`에서 `size`/`cursor`로 바뀌었다.
