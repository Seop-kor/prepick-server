# Consumer Store Discovery GraphQL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인한 사용자가 GraphQL로 주변·신규 매장, 매장 상세, 매장·메뉴 통합 검색, 프로모션을 조회하며 매장·검색 목록을 커서로 이어 받는다.

**Architecture:** 기존 NestJS code-first GraphQL과 MikroORM 패턴을 따른다. PostgreSQL이 거리·검색·정렬·페이지 경계를 계산하고, resolver는 인증된 요청의 인자를 검증해 서비스에 전달한다. `search`의 매장·메뉴 필드는 각각 독립적으로 페이지를 조회한다.

**Tech Stack:** NestJS 11, GraphQL, MikroORM 7, PostgreSQL, Jest. 새 패키지 없음.

**Spec:** `docs/superpowers/specs/2026-09-25-consumer-store-discovery-design.md`

## Global Constraints

- PRD 8.2와 `promotions` 조회만 구현한다. 메뉴 목록·상세와 주문은 포함하지 않는다.
- `store`, `product`, `sku`, `promotion` 테이블과 컬럼은 Spec의 PostgreSQL DDL 그대로 사용한다.
- 모든 새 GraphQL Query는 기존 전역 `AuthGuard`를 적용하고 `@Public()`을 붙이지 않는다.
- 기본 반경은 5km, 최대 50km다. `first`는 기본 20, 허용 범위 1~50이다.
- 매장·상품·SKU·프로모션 조회는 활성 데이터만 사용한다. 일시 품절 처리는 8.3 범위다.
- DB DDL·seed·migration은 실행하거나 파일로 저장하지 않는다. 완료 보고에 샘플 INSERT SQL을 제공한다.
- 테스트 이름은 `~ 하면 ~ 한다` 형식으로 쓴다. 코드 수정 후 `graphify update .`를 실행한다.

## Review Focus

1. 좌표 하나만 입력하거나 범위를 벗어나면 `BAD_USER_INPUT`을 반환한다 — Task 1 테스트.
2. 다른 목록·검색어의 커서를 재사용하면 `BAD_USER_INPUT`을 반환한다 — Task 1 테스트.
3. 검색어에 `%`, `_`, `#`가 포함돼도 문자 그대로 검색한다 — Task 3 테스트.
4. 같은 거리·등록일·이름의 행도 페이지를 넘길 때 중복·누락되지 않는다 — Task 2·3 테스트.
5. 비활성 매장·상품·SKU와 배너가 노출되지 않는다 — Task 2·3·4 테스트.

## File Structure

- `src/stores/discovery.pagination.ts`: 입력 검증, 검색어 이스케이프, 커서 인코딩·검증, 페이지 조립.
- `src/stores/store.entity.ts`, `store.schema.ts`: 매장 GraphQL 출력 및 MikroORM 매핑.
- `src/stores/product.entity.ts`, `product.schema.ts`, `sku.entity.ts`, `sku.schema.ts`: 검색에 쓰는 상품·SKU 매핑. GraphQL의 `menus`는 Consumer 용어를 유지한다.
- `src/stores/discovery.types.ts`: `StorePage`, `MenuSearchHit`, `MenuSearchPage`, `SearchResult` GraphQL 출력 타입.
- `src/stores/stores.service.ts`: 주변·신규·상세 매장과 매장·상품 검색 SQL.
- `src/stores/stores.resolver.ts`, `stores.module.ts`: Query와 `SearchResult` 필드 resolver, ORM schema 등록.
- `src/promotions/promotion.entity.ts`, `promotion.schema.ts`, `promotions.service.ts`, `promotions.resolver.ts`, `promotions.module.ts`: 배너 조회.
- `src/app.module.ts`: 두 feature module 등록.
- `test/stores/discovery.pagination.spec.ts`, `stores.service.spec.ts`, `stores.resolver.spec.ts`, `test/promotions/promotions.service.spec.ts`: 필요한 동작 검증.
- `test/app.e2e-spec.ts`: 새 매장 Query가 익명 요청을 거부하는지 검증.
- `test/app.module.spec.ts`: 새 모듈 등록에 맞춰 기존 import assertion 갱신.

---

### Task 1: 입력 검증과 커서

**Files:**
- Create: `src/stores/discovery.pagination.ts`
- Test: `test/stores/discovery.pagination.spec.ts`

**Interfaces:**
- Produces: `validateLocation(latitude, longitude, required): { latitude: number; longitude: number } | null`, `validateRadius(radiusKm): number`, `validateFirst(first): number`, `validateKeyword(keyword): string`, `validateId(id): string`, `escapeLike(keyword): string`, `encodeCursor(kind, scope, key, id): string`, `decodeCursor(kind, scope, cursor): { key: string | number; id: string } | null`, `slicePage(rows, first, makeCursor): { items; nextCursor }`.
- Cursor kinds: `nearby`, `new`, `store-search`, `menu-search`. Scope is `JSON.stringify` of the normalized filter tuple; cursor includes kind, scope, final sort key and UUID ID. Reject malformed base64url/JSON, incorrect kind or scope, invalid UUID, and non-finite numeric sort keys.

- [ ] **Step 1: Write failing behavior tests**

```ts
const UUID = '00000000-0000-4000-8000-000000000001';
it('좌표 하나만 입력하면 입력 오류를 반환한다', () => {
  expect(() => validateLocation(37.5, undefined, false)).toThrow(BadRequestException);
  expect(() => validateLocation(91, 127, true)).toThrow(BadRequestException);
  expect(() => validateRadius(51)).toThrow(BadRequestException);
  expect(() => validateFirst(0)).toThrow(BadRequestException);
  expect(() => validateId('not-a-uuid')).toThrow(BadRequestException);
});
it('다른 검색어의 커서를 사용하면 입력 오류를 반환한다', () => {
  const cursor = encodeCursor('store-search', 'coffee', 'Cafe', UUID);
  expect(() => decodeCursor('store-search', 'tea', cursor)).toThrow(BadRequestException);
  expect(() => decodeCursor('menu-search', 'coffee', cursor)).toThrow(BadRequestException);
});
it('검색어에 와일드카드가 있으면 문자 그대로 검색하도록 이스케이프한다', () => {
  expect(escapeLike('50%_#')).toBe('50#%#_##');
});
```

- [ ] **Step 2: Run failing tests**

```bash
yarn test --runInBand test/stores/discovery.pagination.spec.ts
```

- [ ] **Step 3: Implement the small shared helpers**

```ts
type CursorKind = 'nearby' | 'new' | 'store-search' | 'menu-search';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateFirst(first = 20): number {
  if (!Number.isInteger(first) || first < 1 || first > 50) throw new BadRequestException('first must be 1-50');
  return first;
}
export function validateRadius(radiusKm = 5): number {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 50) throw new BadRequestException('radiusKm must be 0-50');
  return radiusKm;
}
export function validateLocation(latitude?: number | null, longitude?: number | null, required = false) {
  if (latitude == null && longitude == null && !required) return null;
  if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
    throw new BadRequestException('Invalid location');
  return { latitude, longitude };
}
export function validateKeyword(keyword: string): string {
  const normalized = keyword.trim();
  if (normalized.length < 1 || normalized.length > 100) throw new BadRequestException('Invalid keyword');
  return normalized;
}
export function validateId(id: string): string {
  if (!UUID_RE.test(id)) throw new BadRequestException('Invalid id');
  return id;
}
export function escapeLike(keyword: string): string {
  return keyword.replace(/([#%_])/g, '#$1');
}
export function encodeCursor(kind: CursorKind, scope: string, key: string | number, id: string): string {
  return Buffer.from(JSON.stringify([kind, scope, key, id])).toString('base64url');
}
export function decodeCursor(kind: CursorKind, scope: string, cursor?: string | null) {
  if (cursor == null) return null;
  try {
    if (cursor.length > 2048) throw new Error();
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    if (Buffer.from(raw).toString('base64url') !== cursor) throw new Error();
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length !== 4 || value[0] !== kind || value[1] !== scope
      || typeof value[3] !== 'string' || !UUID_RE.test(value[3])
      || (kind === 'nearby' ? typeof value[2] !== 'number' || !Number.isFinite(value[2])
        : typeof value[2] !== 'string')) throw new Error();
    if (kind === 'new' && new Date(value[2] as string).toISOString() !== value[2]) throw new Error();
    return { key: value[2] as string | number, id: value[3] as string };
  } catch { throw new BadRequestException('Invalid cursor'); }
}
export function slicePage<T>(rows: T[], first: number, makeCursor: (row: T) => string) {
  const items = rows.slice(0, first);
  return { items, nextCursor: rows.length > first ? makeCursor(items[items.length - 1]) : null };
}
```

- [ ] **Step 4: Run tests and commit**

```bash
yarn test --runInBand test/stores/discovery.pagination.spec.ts
git add src/stores/discovery.pagination.ts test/stores/discovery.pagination.spec.ts
git commit -m "feat: validate store discovery pagination"
```

### Task 2: 매장 주변·신규·상세 조회

**Files:**
- Create: `src/stores/store.entity.ts`, `store.schema.ts`, `discovery.types.ts`, `stores.service.ts`, `stores.resolver.ts`, `stores.module.ts`
- Modify: `src/app.module.ts`, `test/app.module.spec.ts`, `test/app.e2e-spec.ts`
- Test: `test/stores/stores.service.spec.ts`, `stores.resolver.spec.ts`

**Interfaces:**
- Consumes: Task 1 validation and cursor helpers.
- Produces: `StoresService.nearby(latitude, longitude, radiusKm, first, after): Promise<StorePage>`, `newStores(first, after): Promise<StorePage>`, `store(id): Promise<Store | null>`; GraphQL `stores`, `newStores`, `store` Queries.
- `Store` maps `store` including `updatedAt` as a persisted field. Only Spec's `createdAt` is exposed in GraphQL; `distanceMeters` is transient and nullable.

- [ ] **Step 1: Write failing service and resolver tests**

```ts
const [A, B, C] = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
];
const row = (id: string) => ({ id, name: 'Cafe', category: 'cafe', address: 'Seoul',
  latitude: 37.5, longitude: 127, image_url: null, is_open: true, is_active: true,
  created_at: new Date('2026-09-25T00:00:00.000Z'),
  updated_at: new Date('2026-09-25T00:00:00.000Z'), distance_meters: 100 });
const execute = jest.fn();
const findOne = jest.fn();
const service = new StoresService({ execute, findOne } as unknown as EntityManager);
beforeEach(() => { execute.mockReset(); findOne.mockReset(); });
it('같은 거리의 매장이 있으면 ID 순서로 다음 페이지를 반환한다', async () => {
  execute.mockResolvedValueOnce([row(A), row(B), row(C)]).mockResolvedValueOnce([row(C)]);
  const page = await service.nearby(37.5, 127.0, 5, 2, null);
  expect(page.items.map(({ id }) => id)).toEqual([A, B]);
  expect(page.nextCursor).toEqual(expect.any(String));
  const nextPage = await service.nearby(37.5, 127.0, 5, 2, page.nextCursor);
  expect(nextPage.items.map(({ id }) => id)).toEqual([C]);
  expect(execute.mock.calls[0][0]).toContain('ORDER BY distance_meters ASC, id ASC');
  expect(execute.mock.calls[1][0]).toContain('(distance_meters, id) >');
});
it('비활성 매장을 조회하면 결과가 없다고 처리한다', async () => {
  findOne.mockResolvedValue(null);
  await expect(service.store(A)).resolves.toBeNull();
  expect(findOne).toHaveBeenCalledWith(Store, { id: A, isActive: true });
});
it('같은 등록일의 신규 매장을 넘기면 ID를 보조 커서로 쓴다', async () => {
  execute.mockResolvedValueOnce([row(C), row(B), row(A)]).mockResolvedValueOnce([row(A)]);
  const page = await service.newStores(2, null);
  expect(page.items.map(({ id }) => id)).toEqual([C, B]);
  expect((await service.newStores(2, page.nextCursor)).items.map(({ id }) => id)).toEqual([A]);
  expect(execute.mock.calls[0][0]).toContain('is_active');
  expect(execute.mock.calls[1][0]).toContain('(created_at, id) <');
});
```

Add to `test/app.e2e-spec.ts`:

```ts
it('로그인하지 않고 매장을 조회하면 인증 오류를 반환한다', async () => {
  const response = await request(app.getHttpServer()).post('/graphql')
    .send({ query: '{ stores(latitude: 37.5, longitude: 127.0) { items { id } } }' }).expect(200);
  expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
});
```

- [ ] **Step 2: Run failing tests**

```bash
yarn test --runInBand test/stores/stores.service.spec.ts test/stores/stores.resolver.spec.ts test/app.module.spec.ts
```

- [ ] **Step 3: Add Store mapping and page GraphQL type**

```ts
@ObjectType()
export class Store {
  @Field(() => ID) id: string = randomUUID();
  @Field() name!: string;
  @Field() category!: string;
  @Field() address!: string;
  latitude!: number;
  longitude!: number;
  @Field(() => String, { nullable: true }) imageUrl!: string | null;
  @Field() isOpen!: boolean;
  isActive!: boolean;
  @Field(() => Int, { nullable: true }) distanceMeters: number | null = null;
  @Field(() => GraphQLISODateTime) createdAt = new Date();
  updatedAt = new Date();
}
export const StoreSchema = new EntitySchema({ class: Store, tableName: 'store', properties: {
  id: { type: 'uuid', primary: true },
  name: { type: String, length: 100 }, category: { type: String, length: 50 },
  address: { type: 'text' }, latitude: { type: 'double precision' }, longitude: { type: 'double precision' },
  imageUrl: { type: 'text', nullable: true },
  isOpen: { type: Boolean, default: false }, isActive: { type: Boolean, default: true },
  createdAt: { type: Date, onCreate: () => new Date() },
  updatedAt: { type: Date, onCreate: () => new Date(), onUpdate: () => new Date() },
} });
@ObjectType()
export class StorePage {
  @Field(() => [Store]) items!: Store[];
  @Field(() => String, { nullable: true }) nextCursor!: string | null;
}
```

- [ ] **Step 4: Implement queries and resolver**

```sql
WITH ranked AS (
  SELECT s.*, 2 * 6371000 * asin(sqrt(least(1,
    power(sin(radians(s.latitude - ?) / 2), 2) +
    cos(radians(?)) * cos(radians(s.latitude)) *
    power(sin(radians(s.longitude - ?) / 2), 2)
  ))) AS distance_meters
  FROM store s WHERE s.is_active
)
SELECT * FROM ranked
WHERE distance_meters <= ?
  /* after cursor: AND (distance_meters, id) > (?, ?::uuid) */
ORDER BY distance_meters ASC, id ASC LIMIT ?;
```

`nearby` binds latitude twice, longitude, radius meters, cursor values when present, and `first + 1`. `newStores` uses `WHERE is_active` and `(created_at, id) < (?::timestamptz, ?::uuid)` after a cursor, then `ORDER BY created_at DESC, id DESC LIMIT ?`. Convert raw snake_case rows to `Store` fields and round displayed meters only after cursor calculation. `store(id)` validates UUID before `em.findOne(Store, { id, isActive: true })`.

```ts
@Query(() => StorePage)
stores(@Args('latitude', { type: () => Float }) latitude: number,
  @Args('longitude', { type: () => Float }) longitude: number,
  @Args('radiusKm', { type: () => Float, defaultValue: 5 }) radiusKm: number,
  @Args('first', { type: () => Int, defaultValue: 20 }) first: number,
  @Args('after', { nullable: true }) after?: string) {
  return this.service.nearby(latitude, longitude, radiusKm, first, after ?? null);
}
@Query(() => StorePage)
newStores(@Args('first', { type: () => Int, defaultValue: 20 }) first: number,
  @Args('after', { nullable: true }) after?: string) {
  return this.service.newStores(first, after ?? null);
}
@Query(() => Store, { nullable: true })
store(@Args('id', { type: () => ID }) id: string) { return this.service.store(id); }
```

- [ ] **Step 5: Run tests, build, and commit**

```bash
yarn test --runInBand test/stores/stores.service.spec.ts test/stores/stores.resolver.spec.ts test/app.module.spec.ts
yarn build
yarn test:e2e --runInBand test/app.e2e-spec.ts
git add src/stores src/app.module.ts test/stores test/app.module.spec.ts test/app.e2e-spec.ts
git commit -m "feat: query nearby and new stores"
```

### Task 3: 매장·상품명 통합 검색

**Files:**
- Create: `src/stores/product.entity.ts`, `product.schema.ts`, `sku.entity.ts`, `sku.schema.ts`
- Modify: `src/stores/discovery.types.ts`, `stores.service.ts`, `stores.resolver.ts`, `stores.module.ts`
- Test: `test/stores/stores.service.spec.ts`, `stores.resolver.spec.ts`

**Interfaces:**
- Consumes: Task 1 cursor helpers, Task 2 `Store` and `StorePage`.
- Produces: `StoresService.searchStores(keyword, location, first, after): Promise<StorePage>`, `searchMenus(keyword, location, first, after): Promise<MenuSearchPage>` and GraphQL `search(keyword, latitude?, longitude?) { stores(first, after), menus(first, after) }`.
- `Product` maps `product`; `Sku` maps `sku` and `product_id`. `MenuSearchHit.minPrice` is `MIN(sku.price)` for active SKUs.

- [ ] **Step 1: Write failing search tests**

```ts
const PRODUCT_ID = '00000000-0000-4000-8000-000000000011';
const STORE_ID = '00000000-0000-4000-8000-000000000012';
const storeColumns = { store_id: STORE_ID, store_name: '브루랩', category: '카페',
  address: '서울', image_url: null, is_open: true, created_at: new Date() };
it('상품명으로 검색하면 활성 SKU의 최저가와 매장을 반환한다', async () => {
  execute.mockResolvedValueOnce([{ product_id: PRODUCT_ID, product_name: '아메리카노',
    min_price: 3500, ...storeColumns }]);
  const page = await service.searchMenus('아메리카노', null, 20, null);
  expect(page.items[0]).toMatchObject({ id: PRODUCT_ID, minPrice: 3500, store: { id: STORE_ID } });
  expect(execute.mock.calls[0][0]).toContain('k.is_active');
  expect(execute.mock.calls[0][0]).toContain('p.is_active');
  expect(execute.mock.calls[0][0]).toContain('s.is_active');
});
it('검색어에 퍼센트가 있으면 와일드카드로 취급하지 않는다', async () => {
  await service.searchStores('50%', null, 20, null);
  expect(execute.mock.calls[0][1]).toContain('%50#%%');
});
it('좌표가 없으면 검색 결과의 거리를 null로 반환한다', async () => {
  execute.mockResolvedValueOnce([{ id: STORE_ID, name: '브루랩', category: '카페',
    address: '서울', image_url: null, is_open: true, created_at: new Date() }]);
  const page = await service.searchStores('카페', null, 20, null);
  expect(page.items[0].distanceMeters).toBeNull();
});
it('이름이 같은 검색 결과를 넘기면 ID 순서로 이어 조회한다', async () => {
  execute.mockResolvedValueOnce([{ id: STORE_ID, name: '브루랩', ...storeColumns },
    { id: PRODUCT_ID, name: '브루랩', ...storeColumns }]).mockResolvedValueOnce([]);
  const page = await service.searchStores('브루랩', null, 1, null);
  expect(page.nextCursor).toEqual(expect.any(String));
  await service.searchStores('브루랩', null, 1, page.nextCursor);
  expect(execute.mock.calls[1][0]).toContain('(name, id) >');
});
```

- [ ] **Step 2: Run failing tests**

```bash
yarn test --runInBand test/stores/stores.service.spec.ts test/stores/stores.resolver.spec.ts
```

- [ ] **Step 3: Add Product/Sku mappings and SearchResult types**

```ts
@ObjectType()
export class SearchResult {
  keyword!: string;
  latitude: number | null = null;
  longitude: number | null = null;
}
@ObjectType()
export class MenuSearchHit {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => Int) minPrice!: number;
  @Field(() => Store) store!: Store;
}
@ObjectType()
export class MenuSearchPage {
  @Field(() => [MenuSearchHit]) items!: MenuSearchHit[];
  @Field(() => String, { nullable: true }) nextCursor!: string | null;
}
export class Product { id = randomUUID(); storeId!: string; name!: string; isActive = true; }
export const ProductSchema = new EntitySchema({ class: Product, tableName: 'product', properties: {
  id: { type: 'uuid', primary: true }, storeId: { type: 'uuid', fieldName: 'store_id' },
  name: { type: String, length: 100 }, isActive: { type: Boolean, default: true },
} });
export class Sku { id = randomUUID(); productId!: string; name!: string; price!: number; isActive = true; }
export const SkuSchema = new EntitySchema({ class: Sku, tableName: 'sku', properties: {
  id: { type: 'uuid', primary: true }, productId: { type: 'uuid', fieldName: 'product_id' },
  name: { type: String, length: 100 }, price: { type: 'int' },
  isActive: { type: Boolean, default: true },
} });
// StoresModule imports MikroOrmModule.forFeature([StoreSchema, ProductSchema, SkuSchema]).
```

- [ ] **Step 4: Implement independent field pagination**

```sql
-- Store search: name ILIKE ? ESCAPE '#', keyset (name, id) > (?, ?::uuid).
-- Menu search:
SELECT p.id AS product_id, p.name AS product_name,
  s.id AS store_id, s.name AS store_name, s.category, s.address,
  s.image_url, s.is_open, s.created_at, min(k.price) AS min_price
FROM product p
JOIN store s ON s.id = p.store_id AND s.is_active
JOIN sku k ON k.product_id = p.id AND k.is_active
WHERE p.is_active AND p.name ILIKE ? ESCAPE '#'
  /* after cursor: AND (p.name, p.id) > (?, ?::uuid) */
GROUP BY p.id, s.id
ORDER BY p.name ASC, p.id ASC LIMIT ?;
```

Map both search pages with `first + 1` rows; each cursor uses its own kind and normalized keyword scope. Change `StoresResolver` to `@Resolver(() => SearchResult)` so its `@ResolveField` methods attach to that type; the existing root `@Query` methods remain root fields. Parent `search` validates keyword and paired coordinates once. When coordinates are present, select the same Haversine expression used in Task 2 for the associated store and round it to `distanceMeters`; otherwise return `null`.

```ts
@Query(() => SearchResult)
search(@Args('keyword') keyword: string,
  @Args('latitude', { type: () => Float, nullable: true }) latitude?: number,
  @Args('longitude', { type: () => Float, nullable: true }) longitude?: number): SearchResult {
  const location = validateLocation(latitude, longitude, false);
  return { keyword: validateKeyword(keyword), latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null };
}
@ResolveField(() => StorePage, { name: 'stores' })
searchStores(@Parent() parent: SearchResult,
  @Args('first', { type: () => Int, defaultValue: 20 }) first: number,
  @Args('after', { nullable: true }) after?: string) {
  const location = parent.latitude === null ? null : { latitude: parent.latitude, longitude: parent.longitude! };
  return this.service.searchStores(parent.keyword, location, first, after ?? null);
}
@ResolveField(() => MenuSearchPage, { name: 'menus' })
searchMenus(@Parent() parent: SearchResult,
  @Args('first', { type: () => Int, defaultValue: 20 }) first: number,
  @Args('after', { nullable: true }) after?: string) {
  const location = parent.latitude === null ? null : { latitude: parent.latitude, longitude: parent.longitude! };
  return this.service.searchMenus(parent.keyword, location, first, after ?? null);
}
```

- [ ] **Step 5: Run tests, build, and commit**

```bash
yarn test --runInBand test/stores/stores.service.spec.ts test/stores/stores.resolver.spec.ts
yarn build
git add src/stores test/stores
git commit -m "feat: search stores and products with cursors"
```

### Task 4: 프로모션과 전체 연결 확인

**Files:**
- Create: `src/promotions/promotion.entity.ts`, `promotion.schema.ts`, `promotions.service.ts`, `promotions.resolver.ts`, `promotions.module.ts`
- Modify: `src/app.module.ts`, `test/app.module.spec.ts`
- Test: `test/promotions/promotions.service.spec.ts`

**Interfaces:**
- Produces: `PromotionsService.list(): Promise<Promotion[]>`, authenticated GraphQL `promotions: [Promotion!]!`.

- [ ] **Step 1: Write failing promotion tests**

```ts
const banner = new Promotion();
const find = jest.fn().mockResolvedValue([banner]);
const service = new PromotionsService({ find } as unknown as EntityManager);
it('프로모션을 조회하면 활성 배너만 표시 순서대로 반환한다', async () => {
  await expect(service.list()).resolves.toEqual([banner]);
  expect(find).toHaveBeenCalledWith(Promotion, { isActive: true }, { orderBy: { sortOrder: 'ASC', id: 'ASC' } });
});
```

- [ ] **Step 2: Run failing test**

```bash
yarn test --runInBand test/promotions/promotions.service.spec.ts
```

- [ ] **Step 3: Add entity, service, resolver and module**

```ts
@ObjectType()
export class Promotion {
  @Field(() => ID) id: string = randomUUID();
  @Field() title!: string;
  @Field() description!: string;
  @Field(() => String, { nullable: true }) imageUrl!: string | null;
  sortOrder = 0;
  isActive = true;
}
export const PromotionSchema = new EntitySchema({ class: Promotion, tableName: 'promotion', properties: {
  id: { type: 'uuid', primary: true }, title: { type: String, length: 100 },
  description: { type: 'text' }, imageUrl: { type: 'text', nullable: true },
  sortOrder: { type: 'int', default: 0 }, isActive: { type: Boolean, default: true },
} });
@Injectable()
export class PromotionsService {
  constructor(private readonly em: EntityManager) {}
  list(): Promise<Promotion[]> {
    return this.em.find(Promotion, { isActive: true }, { orderBy: { sortOrder: 'ASC', id: 'ASC' } });
  }
}
@Query(() => [Promotion])
promotions() { return this.promotionsService.list(); }
// PromotionsModule: MikroOrmModule.forFeature([PromotionSchema]), PromotionsService, PromotionsResolver.
// AppModule imports PromotionsModule; test/app.module.spec.ts mocks and asserts it.
```

- [ ] **Step 4: Run focused/full verification and update graph**

```bash
yarn test --runInBand test/promotions/promotions.service.spec.ts test/app.module.spec.ts
yarn test --runInBand
yarn build
yarn test:e2e --runInBand
graphify update .
git diff --check
```

Integration tests require the user's manually provisioned four tables and `TEST_DATABASE_URL`; do not run them against an unknown DB. Once the user confirms table preparation, run `yarn test:integration --runInBand`. Include the following sample data SQL in the final handoff without writing a seed file or executing it:

```sql
INSERT INTO store (id, name, category, address, latitude, longitude, is_open, created_at)
VALUES
  ('00000000-0000-4000-8000-000000000101', '브루랩 강남점', '카페', '서울 강남구 테헤란로 123', 37.5005, 127.0365, true, now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000102', '커피하우스 역삼점', '카페', '서울 강남구 테헤란로 145', 37.5012, 127.0390, false, now());

INSERT INTO product (id, store_id, name)
VALUES
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', '아메리카노'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', '카페라떼'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000102', '아메리카노');

INSERT INTO sku (id, product_id, name, price)
VALUES
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201', 'HOT', 3500),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000201', 'ICE', 4000),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000202', 'ICE', 4500),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000203', 'ICE', 4000);

INSERT INTO promotion (id, title, description, sort_order)
VALUES ('00000000-0000-4000-8000-000000000401', '첫 주문을 시작해보세요!', '주변 인기 카페를 빠르게 주문할 수 있어요.', 1);
```

- [ ] **Step 5: Commit the feature**

```bash
git add src/promotions src/app.module.ts test/promotions test/app.module.spec.ts graphify-out/graph.json graphify-out/GRAPH_REPORT.md graphify-out/manifest.json graphify-out/cost.json
git commit -m "feat: expose active promotions"
```
