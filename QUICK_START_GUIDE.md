# Quick Start Guide - Shopping Cart Feature

## For the Developer

This guide will help you quickly set up and test the new shopping cart and order management features.

## Step 1: Database Setup

Run the migration to add the new tables and seed products:

```bash
cd backend
mysql -u root -p plant_health_db < migration_add_shop.sql
```

Or if using a different database user/name:
```bash
mysql -u [your_username] -p [your_database_name] < migration_add_shop.sql
```

**Verify the migration worked:**
```bash
mysql -u root -p plant_health_db -e "SELECT COUNT(*) as product_count FROM products;"
```
Should return: `product_count: 6`

## Step 2: Start the Application

### Backend
```bash
cd backend
# Make sure .env is configured with your MySQL credentials
python main.py
```

Backend should start on `http://127.0.0.1:8000`

### Frontend
```bash
cd front
npm install  # if not already installed
npm run dev
```

Frontend should start on `http://localhost:5173` (or similar)

## Step 3: Quick Test Flow

### A. Test Shop Page
1. Navigate to the "商城" (Shop) tab
2. You should see 6 products loaded from the database
3. Try clicking different category buttons (全部商品, 肥料, 杀虫剂, etc.)
4. Products should filter accordingly

### B. Test Cart Functionality
1. Click "加入购物车" on any product
2. The cart icon in the header should show a badge with count
3. Click the cart icon to open the cart modal
4. Try:
   - Adjusting quantity with +/- buttons
   - Removing an item
   - Adding more products
   - Clicking "清空购物车" to clear all

### C. Test Checkout (Requires Wallet)

**For ETH Payment:**
1. Make sure MetaMask is installed
2. Switch to Sepolia Testnet
3. Have some test ETH (get from faucet if needed)
4. Click "立即支付" in cart
5. Select "以太坊" payment option
6. Click "连接钱包并支付"
7. Approve the transaction in MetaMask

**For CKB Payment:**
1. Have JoyID or UTXO wallet ready
2. Make sure you have test CKB
3. Click "立即支付" in cart
4. Select "CKB" payment option
5. Choose wallet type (JoyID or UTXO)
6. Click "连接钱包并支付"
7. Approve in your wallet

### D. Test My Orders
1. After successful payment, navigate to "我的" (Profile) tab
2. You should see "我的订单" instead of "设置"
3. Click "我的订单"
4. Your order should appear with status "已支付"
5. Verify order details (order number, amount, payment method)

## API Endpoints to Test

You can also test the API directly:

### Get Products
```bash
curl http://127.0.0.1:8000/products
```

### Get Products by Category
```bash
curl "http://127.0.0.1:8000/products?category=肥料"
```

### Create Order (requires authentication)
```bash
# First login to get token
curl -X POST http://127.0.0.1:8000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test_user","password":"test_password"}'

# Use the token to create an order
curl -X POST http://127.0.0.1:8000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "items": [{"product_id": 1, "quantity": 2}],
    "payment_method": "eth",
    "transaction_hash": "0x123...",
    "wallet_address": "0x456..."
  }'
```

### Get User Orders (requires authentication)
```bash
curl http://127.0.0.1:8000/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Troubleshooting

### Issue: Products not loading
**Solution:** 
- Check if backend is running
- Verify migration ran successfully
- Check browser console for errors
- Verify BASE_URL in App.jsx matches your backend URL

### Issue: "Module not found" error
**Solution:**
```bash
cd backend
pip install -r requirements.txt
```

### Issue: Cart modal not showing
**Solution:**
- Check browser console for JavaScript errors
- Verify React state is updating (use React DevTools)

### Issue: Payment fails
**Solution:**
- Ensure wallet is connected to correct network (Sepolia for ETH, Testnet for CKB)
- Check you have sufficient test tokens
- Verify wallet extension is installed and unlocked
- Check browser console for error messages

### Issue: Order not created
**Solution:**
- Check backend logs for errors
- Verify user is authenticated (token is valid)
- Ensure transaction hash is provided
- Check MySQL connection is working

## Common Development Tasks

### Add a New Product
```sql
INSERT INTO products (name, description, price, category, tag, icon_class, bg_gradient) 
VALUES (
  '新产品', 
  '产品描述', 
  '¥99.9', 
  '工具', 
  '新品', 
  'fa-star', 
  'from-purple-400 to-pink-500'
);
```

### Check Order Status
```sql
SELECT o.order_number, o.total_amount, o.status, o.payment_method, u.username
FROM orders o
JOIN users u ON o.user_id = u.id
ORDER BY o.created_at DESC
LIMIT 10;
```

### View Order Details
```sql
SELECT o.order_number, p.name, oi.quantity, oi.price
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.order_number = 'ORD202601031429123';
```

## Code Structure Reference

### Backend Files
```
backend/
├── models.py           # Added Product, Order, OrderItem models
├── schemas.py          # Added product/order schemas
├── main.py             # Added /products and /orders endpoints
└── migration_add_shop.sql  # Database migration script
```

### Frontend Files
```
front/
└── App.jsx            # All cart & order functionality added here
```

## Next Steps

After testing, you can:
1. Customize product images (replace gradient backgrounds)
2. Add more products via SQL or admin interface
3. Implement order status updates
4. Add email notifications for orders
5. Create admin panel for order management

## Support

If you encounter any issues:
1. Check the detailed documentation in `SHOPPING_CART_FEATURE.md`
2. Review the visual guide in `IMPLEMENTATION_VISUAL_GUIDE.md`
3. Check backend logs for error messages
4. Use browser DevTools to inspect frontend errors

## Success Indicators

You'll know everything is working when:
- ✅ Products load on shop page
- ✅ Category filtering works
- ✅ Cart badge updates when adding items
- ✅ Cart modal shows correct items and totals
- ✅ Checkout modal opens with payment options
- ✅ Payment completes successfully
- ✅ Order appears in My Orders page
- ✅ Database has order records

Happy testing! 🎉
