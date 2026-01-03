# Shopping Cart and Order Management Feature

## Overview
This update adds comprehensive shopping cart and order management functionality to the AI Plant Health Check application, including:
- Shopping cart with add/remove/update quantity features
- Checkout system with blockchain payment integration (ETH and CKB)
- Order history and management
- Profile page update: "Settings" changed to "My Orders"

## Features Implemented

### 1. Shopping Cart (商城下单加入购物车)
- **Dynamic Product Loading**: Products are loaded from the backend database
- **Category Filtering**: Filter products by category (肥料, 杀虫剂, 土壤改良, 工具)
- **Add to Cart**: Click the shopping cart button on any product to add it to cart
- **Cart Badge**: Shows total quantity of items in cart on the shop page header
- **Cart Modal**: View cart contents, adjust quantities, remove items, or clear cart

### 2. Payment Integration (购物车立即支付弹窗对接ETH支付和CKB支付)
- **Checkout Modal**: Opens when user clicks "立即支付" (Pay Now) in cart
- **Dual Payment Options**:
  - **ETH Payment**: Uses MetaMask on Sepolia Testnet
  - **CKB Payment**: Supports JoyID and UTXO wallets on CKB Testnet
- **Wallet Connection**: Automatically connects to selected wallet type
- **Transaction Processing**: Creates order with blockchain transaction hash
- **Order Confirmation**: Displays success message and clears cart after successful payment

### 3. My Orders Page (我的订单)
- **Profile Update**: "设置" (Settings) button replaced with "我的订单" (My Orders)
- **Order History**: View all past orders with details
- **Order Status**: Shows payment status (待支付/已支付/已完成)
- **Order Details**: Displays order number, total amount, payment method, and timestamp

## Database Changes

### New Tables

#### Products Table
```sql
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price VARCHAR(20) NOT NULL,
    category VARCHAR(50),
    tag VARCHAR(50),
    icon_class VARCHAR(50),
    bg_gradient VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Orders Table
```sql
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount VARCHAR(20) NOT NULL,
    payment_method VARCHAR(20),
    transaction_hash VARCHAR(200),
    wallet_address VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

#### Order Items Table
```sql
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price VARCHAR(20) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
);
```

### Initial Product Data
The migration includes 6 initial products:
1. 植物营养液 (¥29.9) - Fertilizer
2. 杀虫剂 (¥39.9) - Pesticide
3. 有机营养土 (¥49.9) - Soil improver
4. 植物修复剂 (¥35.9) - Plant repair
5. 园艺剪刀 (¥25.9) - Garden scissors
6. 浇水壶 (¥18.9) - Watering can

## Backend API Endpoints

### Product Endpoints
- `GET /products` - Get all products (optional category filter)
- `GET /products/{product_id}` - Get single product details

### Order Endpoints
- `POST /orders` - Create new order with payment
- `GET /orders` - Get current user's orders
- `GET /orders/{order_id}` - Get specific order details

## Frontend Components

### New State Variables
```javascript
const [products, setProducts] = useState([]);
const [selectedCategory, setSelectedCategory] = useState('全部商品');
const [cart, setCart] = useState([]);
const [showCartModal, setShowCartModal] = useState(false);
const [showCheckoutModal, setShowCheckoutModal] = useState(false);
const [showOrdersPage, setShowOrdersPage] = useState(false);
const [orders, setOrders] = useState([]);
const [checkoutLoading, setCheckoutLoading] = useState(false);
```

### New Functions
- `fetchProducts()` - Load products from backend
- `fetchOrders()` - Load user's orders
- `addToCart(product)` - Add product to cart
- `updateCartQuantity(productId, quantity)` - Update item quantity
- `removeFromCart(productId)` - Remove item from cart
- `clearCart()` - Empty the cart
- `getCartTotal()` - Calculate total price
- `handleCheckout()` - Open checkout modal
- `handlePayment()` - Process payment and create order

### New Pages/Modals
- `renderShopPage()` - Enhanced with dynamic products and cart
- `renderOrdersPage()` - Display order history
- Cart Modal - Manage cart items
- Checkout Modal - Select payment method and pay

## Installation & Setup

### 1. Run Database Migration
```bash
cd backend
mysql -u [username] -p plant_health_db < migration_add_shop.sql
```

Or manually execute the SQL commands in `migration_add_shop.sql`.

### 2. Install Dependencies
Backend dependencies are already in `requirements.txt`. No new frontend dependencies required.

### 3. Start the Application
```bash
# Backend
cd backend
python main.py

# Frontend
cd front
npm run dev
```

## Usage Flow

### Shopping and Checkout
1. **Browse Products**: Navigate to "商城" (Shop) page
2. **Filter Products**: Click category buttons to filter
3. **Add to Cart**: Click "加入购物车" on any product
4. **View Cart**: Click cart icon in header (shows item count)
5. **Manage Cart**: In cart modal, adjust quantities or remove items
6. **Checkout**: Click "立即支付" to open payment modal
7. **Select Payment**: Choose ETH or CKB payment method
8. **Connect Wallet**: For CKB, also select wallet type (JoyID/UTXO)
9. **Confirm Payment**: Click to connect wallet and confirm transaction
10. **Order Created**: Success message shown, cart cleared

### View Orders
1. Navigate to "我的" (Profile) page
2. Click "我的订单" (My Orders) icon
3. View all orders with status and details

## Testing Notes

Since this is a blockchain-integrated application, testing requires:
- MetaMask wallet with Sepolia testnet ETH for ETH payments
- JoyID or UTXO wallet with CKB testnet tokens for CKB payments
- MySQL database configured and running
- Backend server running on configured BASE_URL

## Code Quality

- ✅ Backend models follow existing conventions
- ✅ Frontend state management consistent with existing patterns
- ✅ Payment flow reuses existing wallet connection logic
- ✅ Error handling for all API calls
- ✅ User feedback (alerts, success messages)
- ✅ Responsive design matching existing UI

## Future Enhancements

Potential improvements:
- Add product images (currently using icon placeholders)
- Implement order status updates
- Add order cancellation functionality
- Include delivery/shipping information
- Add product reviews and ratings
- Implement discount codes/coupons
- Add order tracking
- Email notifications for orders
