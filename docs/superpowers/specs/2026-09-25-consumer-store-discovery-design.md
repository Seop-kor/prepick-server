# Consumer 홈·매장 탐색 GraphQL 설계

## 목표와 범위

로그인한 Consumer App 사용자가 현재 위치 주변의 매장, 신규 매장, 매장 상세, 매장명·메뉴명 검색 결과, 홈 프로모션 배너를 조회한다. PRD 8.2의 REST 경로는 기능 목록으로 해석하고 API는 기존 NestJS code-first GraphQL에 추가한다. 가까운 매장, 신규 매장, 검색의 매장 결과와 메뉴 결과는 모두 무한 스크롤을 지원한다.

이번 범위는 조회 전용이다. 매장 메뉴 목록·카테고리·메뉴 상세는 PRD 8.3에서 구현한다. 관리자 API, 영업 시간 자동 계산, 지도 API, PostGIS는 추가하지 않는다.

## 기존 스키마와 데이터 구성

옛 `schema.graphql`의 `Store`는 사업체, `Location`은 실제 지점이다. 옛 `Product`가 판매 메뉴이고 `Sku`가 가격을 가진 하위 상품이다. 옛 `Menu`는 판매 메뉴가 아니라 메뉴판 배치 설정이다. 이번 앱은 지점 단위 탐색·주문만 필요하므로 사업체와 지점을 별도 테이블로 나누지 않고, 옛 `Location`과 `StoreInfo`의 Consumer 표시 정보를 새 `Store`에 모은다. 다지점 사업체 관계가 필요해지면 그때 별도 사업체 모델을 추가한다.

- `Store`: UUID ID, 지점 이름, 카테고리, 주소, 위도·경도, 선택적 이미지 URL, `isOpen`, `isActive`, 등록일. 옛 `Location.name/address/state`와 `StoreInfo.logo`에 대응한다. 옛 스키마에 없는 좌표는 주변 매장 조회를 위해 추가한다. `isOpen`은 DB에서 수동 관리하는 현재 영업 상태이며 `isActive`는 Consumer 노출 여부다.
- `Menu`: UUID ID, 매장 ID, 이름, `isActive`. 옛 `Product`에 대응한다.
- `MenuVariant`: UUID ID, 메뉴 ID, 이름, 원화 단위 가격, `isActive`. 옛 `Sku`에 대응한다. 검색 결과의 `minPrice`는 활성 하위 상품 가격의 최솟값으로 계산하며 별도 저장하지 않는다. 활성 하위 상품이 없는 메뉴는 검색 결과에서 제외한다. `isActive`는 판매 목록 게시 여부이며 일시 품절 상태는 8.3에서 별도로 다룬다. 하위 상품을 조회·선택하는 API도 8.3에서 추가한다.
- `Promotion`: UUID ID, 제목, 설명, 선택적 이미지 URL, 표시 순서, `isActive`. 노출 기간과 클릭 동작은 요구사항에 없어 포함하지 않는다.

옛 스키마의 AWS 인증 지시문, S3 객체, 메뉴판 구성, 사업체 관리, 재고·정산 모델은 이 앱의 조회에 필요하지 않다. 이미지에는 URL만 저장하고 프로모션은 새 모델로 둔다. MikroORM entity/schema를 기존 패턴대로 기능 모듈에 등록한다. 매장 검색은 활성 매장만, 메뉴 검색은 활성 메뉴·활성 하위 상품·활성 매장만, 프로모션 조회는 활성 배너만 반환한다. DB 테이블과 샘플 데이터는 사용자가 수동으로 생성한다. 애플리케이션은 DDL·자동 seed를 실행하지 않으며 저장소에 SQL·seed 파일을 추가하지 않는다. 구현 결과에 PostgreSQL 테이블 생성과 샘플 데이터 삽입 SQL을 텍스트로 제공한다.

## GraphQL 계약

모든 쿼리는 기존 전역 인증 guard를 통과해야 한다.

```graphql
type Query {
  stores(latitude: Float!, longitude: Float!, radiusKm: Float = 5, first: Int = 20, after: String): StorePage!
  newStores(first: Int = 20, after: String): StorePage!
  store(id: ID!): Store
  search(keyword: String!, latitude: Float, longitude: Float): SearchResult!
  promotions: [Promotion!]!
}

type SearchResult {
  stores(first: Int = 20, after: String): StorePage!
  menus(first: Int = 20, after: String): MenuSearchPage!
}

type StorePage { items: [Store!]!, nextCursor: String }
type MenuSearchPage { items: [MenuSearchHit!]!, nextCursor: String }

type Store {
  id: ID!
  name: String!
  category: String!
  address: String!
  imageUrl: String
  isOpen: Boolean!
  distanceMeters: Int
  createdAt: DateTime!
}

type MenuSearchHit {
  id: ID!
  name: String!
  minPrice: Int!
  store: Store!
}

type Promotion {
  id: ID!
  title: String!
  description: String!
  imageUrl: String
}
```

`search`의 두 필드는 독립적인 커서를 받는다. 클라이언트는 한 GraphQL 요청에서 둘 다 선택하거나, 다음 페이지가 필요한 필드만 선택할 수 있다. `latitude`와 `longitude`는 검색에서 둘 다 생략하거나 둘 다 제공한다. 생략하면 `distanceMeters`는 `null`이며 검색은 계속 동작한다. `store(id)`도 좌표를 받지 않으므로 `distanceMeters`는 `null`이다.

## 조회와 페이지 규칙

- `stores`: PostgreSQL의 Haversine 계산으로 요청 좌표에서 기본 5km 이내 활성 매장을 거리 오름차순, ID 오름차순으로 반환한다. 별도 공간 확장은 사용하지 않는다. 거리 표시는 미터 단위 정수다.
- `newStores`: 활성 매장을 등록일 내림차순, ID 내림차순으로 반환한다. 최근 N일 제한은 두지 않는다.
- `store`: 활성 매장 한 건을 반환한다. 없거나 비활성이면 `null`이다.
- `search.stores`: 공백을 제거한 검색어가 매장명에 포함된 활성 매장을 이름 오름차순, ID 오름차순으로 반환한다.
- `search.menus`: 검색어가 메뉴명에 포함되고 활성 하위 상품이 하나 이상 있는 활성 메뉴를 이름 오름차순, ID 오름차순으로 반환하며 소속 매장과 활성 하위 상품의 최저가를 포함한다.
- `promotions`: 활성 배너를 표시 순서 오름차순, ID 오름차순으로 반환한다.

목록은 커서 기반 keyset pagination을 사용한다. `first`는 기본 20, 허용 범위 1~50이며 한 건을 더 조회해 `nextCursor` 유무를 결정한다. 커서는 페이지 종류, 검색어 또는 좌표·반경 필터, 마지막 정렬값과 ID를 담은 불투명 문자열이다. 다른 필터·목록에 사용하거나 형식이 잘못된 커서는 입력 오류로 처리한다. 결과가 없으면 빈 `items`와 `null` 커서를 반환한다. 새 데이터의 추가나 상태 변경으로 페이지 사이 결과가 달라질 수 있으나, 같은 정렬값의 중복·누락을 막기 위해 ID를 보조 정렬키로 사용한다.

좌표는 위도 -90~90, 경도 -180~180의 유한한 수여야 한다. 반경은 0 초과 50km 이하로 제한한다. 검색어는 앞뒤 공백을 제거한 뒤 1~100자여야 한다. 잘못된 입력은 GraphQL 입력 오류로 반환하고 인증 실패는 기존 guard의 오류 형식을 따른다.

## 구현 경계와 검증

`StoresModule`이 매장 조회와 매장명 검색을, `PromotionsModule`이 배너 조회를 맡는다. 메뉴명 검색은 `SearchResult`의 필드 resolver에서 메뉴와 하위 상품 가격을 조회하며 메뉴 목록·상세 API는 추가하지 않는다. 공통 페이지 타입 또는 커서 로직은 실제로 공유되는 최소 부분만 둔다. `AppModule`에는 두 모듈을 등록한다.

거리·반경·동일 정렬값의 다음 페이지, 신규 매장 페이지, 매장/메뉴 검색 분리, 비활성 데이터 제외, 잘못된 커서와 입력을 검증한다. DB 테이블이 준비되기 전에도 단위 테스트와 빌드는 실행할 수 있어야 한다. 실제 DB 연동 검증은 구현 결과에 제공한 SQL을 사용자가 실행한 뒤 수행한다.
