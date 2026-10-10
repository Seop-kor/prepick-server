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
    await expect(
      validate(input({ request: undefined })),
    ).resolves.toBeDefined();
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
    [
      '항목이 50개를 넘으면',
      { items: Array.from({ length: 51 }, () => item()) },
    ],
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
