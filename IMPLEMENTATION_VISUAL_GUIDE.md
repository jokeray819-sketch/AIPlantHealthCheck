# Shopping Cart Implementation - Visual Guide

## 1. Shop Page with Dynamic Products

### Before
- Static hardcoded products
- No cart functionality
- Cart icon showed "0" always

### After
- Products loaded from database
- Category filtering works
- Add to cart functionality
- Cart badge shows actual item count
- Visual feedback when adding to cart

```
┌─────────────────────────────────┐
│  商城            🛒 (3)          │  ← Cart shows count
├─────────────────────────────────┤
│  [全部商品][肥料][杀虫剂]...      │  ← Category filters
├─────────────────────────────────┤
│ ┌──────┐  ┌──────┐              │
│ │ 🌿   │  │ 🐛   │              │
│ │营养液 │  │杀虫剂 │              │
│ │¥29.9 │  │¥39.9 │              │
│ │[加入购物车]  [✓已添加]          │  ← Visual feedback
│ └──────┘  └──────┘              │
└─────────────────────────────────┘
```

## 2. Shopping Cart Modal

Click the cart icon to open:

```
┌─────────────────────────────────┐
│  购物车                     ✕    │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 植物营养液           🗑️      │ │
│ │ ¥29.9                       │ │
│ │ [-]  2  [+]                 │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 杀虫剂              🗑️       │ │
│ │ ¥39.9                       │ │
│ │ [-]  1  [+]                 │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ 总计                  ¥99.7     │
├─────────────────────────────────┤
│ [清空购物车]    [立即支付]        │
└─────────────────────────────────┘
```

Features:
- View all items in cart
- Adjust quantity with +/- buttons
- Remove individual items
- Clear entire cart
- See real-time total
- Proceed to checkout

## 3. Checkout Payment Modal

When clicking "立即支付":

```
┌─────────────────────────────────┐
│  确认支付                   ✕    │
├─────────────────────────────────┤
│ 订单摘要:                        │
│ 植物营养液 x2        ¥59.8      │
│ 杀虫剂 x1            ¥39.9      │
│ ──────────────────────────────  │
│ 总计                 ¥99.7      │
├─────────────────────────────────┤
│ 选择支付方式:                     │
│ ┌──────┐  ┌──────┐              │
│ │  Ξ   │  │ ⬡    │              │  ← Payment options
│ │ ETH  │  │ CKB  │              │
│ └──────┘  └──────┘              │
│                                 │
│ [CKB Only] 选择钱包:             │
│ ┌──────┐  ┌──────┐              │
│ │ 😊   │  │ 💰   │              │
│ │JoyID │  │UTXO  │              │
│ └──────┘  └──────┘              │
│                                 │
│ ✓ 钱包已连接: 0x84Ae...Ea2A7    │
├─────────────────────────────────┤
│    [💰 确认支付]                 │
└─────────────────────────────────┘
```

Features:
- Order summary with all items
- Choose ETH or CKB payment
- For CKB: select JoyID or UTXO wallet
- Wallet connection status
- One-click payment

## 4. Profile Page - My Orders

### Before
```
┌─────────────────────────────────┐
│ 快捷入口                         │
│ [🌿我的植物][📜诊断历史]           │
│ [🔔提醒消息][⚙️设置]             │  ← Old: Settings
└─────────────────────────────────┘
```

### After
```
┌─────────────────────────────────┐
│ 快捷入口                         │
│ [🌿我的植物][📜诊断历史]           │
│ [🔔提醒消息][📄我的订单]          │  ← New: My Orders
└─────────────────────────────────┘
```

## 5. My Orders Page

Click "我的订单" to view:

```
┌─────────────────────────────────┐
│  ← 我的订单                      │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 订单号: ORD202601031429123  │ │
│ │ 2026-01-03 14:29            │ │
│ │                    [已支付]  │ │
│ │ ──────────────────────────  │ │
│ │ 总计                ¥99.7   │ │
│ │ 支付方式: ETH               │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 订单号: ORD202601021234567  │ │
│ │ 2026-01-02 12:34            │ │
│ │                    [已完成]  │ │
│ │ ──────────────────────────  │ │
│ │ 总计                ¥35.9   │ │
│ │ 支付方式: CKB               │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

Features:
- View all orders chronologically
- Order number for reference
- Timestamp of order
- Payment status badge
- Total amount paid
- Payment method used (ETH/CKB)

## Key Files Modified

### Backend
1. **models.py**
   - Added `Product` model
   - Added `Order` model
   - Added `OrderItem` model

2. **schemas.py**
   - Added `ProductResponse`
   - Added `OrderCreateRequest`
   - Added `OrderResponse`
   - Added `OrderItemResponse`

3. **main.py**
   - Added `/products` endpoints
   - Added `/orders` endpoints
   - Imported new models and schemas

4. **migration_add_shop.sql**
   - New tables: products, orders, order_items
   - Initial product data (6 products)

### Frontend
1. **App.jsx**
   - Added cart state management
   - Added product/order fetch functions
   - Added cart manipulation functions
   - Enhanced `renderShopPage()` with dynamic products
   - Added `renderOrdersPage()`
   - Added cart modal UI
   - Added checkout modal UI
   - Changed Settings to My Orders

## Testing Checklist

To test in production environment:

- [ ] Run MySQL migration script
- [ ] Start backend server
- [ ] Verify products load in shop page
- [ ] Test category filtering
- [ ] Add products to cart
- [ ] Verify cart count updates
- [ ] Open cart modal and test:
  - [ ] Quantity adjustment
  - [ ] Item removal
  - [ ] Clear cart
  - [ ] Total calculation
- [ ] Test checkout flow:
  - [ ] ETH payment with MetaMask
  - [ ] CKB payment with JoyID
  - [ ] CKB payment with UTXO wallet
- [ ] Verify order creation
- [ ] Check My Orders page shows order
- [ ] Verify order details are correct

## Integration Points

The shopping cart integrates with existing features:

1. **Authentication**: Must be logged in to checkout
2. **Wallet Connection**: Reuses existing ETH/CKB wallet logic
3. **Payment Flow**: Similar to membership purchase flow
4. **UI Design**: Matches existing card-shadow, button styles
5. **Database**: Uses same MySQL connection and patterns

## Summary

✅ **Complete Shopping Experience**
- Browse products dynamically
- Filter by category
- Add to cart with visual feedback
- Manage cart contents
- Choose payment method (ETH/CKB)
- Complete secure blockchain payment
- View order history

✅ **User Interface Updates**
- Profile page now shows "My Orders" instead of "Settings"
- Consistent design language
- Responsive modals
- Clear user feedback

✅ **Backend Infrastructure**
- RESTful API endpoints
- Proper data models
- Transaction recording
- Order management
