/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";

const formatKES = (value) => (value ? `KSH ${Number(value).toLocaleString("en-KE")}` : "KSH 0");

function ProductDetail() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/products/${id}`);
        setProduct(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    try {
      await API.post("/customer/cart", { productId: id, quantity });
      alert("Added to cart!");
      navigate("/cart");
    } catch (err) {
      console.error(err);
      alert("Failed to add to cart");
    }
  };

  const handleAddToWishlist = async () => {
    try {
      await API.post("/customer/wishlist", { productId: id });
      alert("Added to wishlist!");
      navigate("/wishlist");
    } catch (err) {
      console.error(err);
      alert("Failed to add to wishlist");
    }
  };

  const handleBuyNow = async () => {
    try {
      const orderRes = await API.post("/customer/orders", { products: [{ productId: id, quantity }] });
      const orderId = orderRes.data._id;
      navigate(`/payments/${orderId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to place order");
    }
  };

  if (loading) return <div>Loading product...</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div className={`min-h-screen p-8 ${isDark ? "bg-slate-900 text-white" : "bg-[#FDFCFB] text-gray-900"}`}>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <img src={product.imageUrl ? `http://localhost:5000${product.imageUrl}` : "https://via.placeholder.com/400"} alt={product.name} className="rounded-lg w-full" />
        <div>
          <h2 className="text-3xl font-bold mb-4">{product.name}</h2>
          <p className="text-indigo-600 text-xl font-bold mb-4">{formatKES(product.price)}</p>
          <p className="mb-6">{product.description}</p>
          <div className="flex items-center mb-4">
            <label className="mr-2">Quantity:</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-20 p-2 border rounded" />
          </div>
          <div className="flex gap-4">
            <button onClick={handleBuyNow} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold">Buy Now</button>
            <button onClick={handleAddToCart} className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold">Add to Cart</button>
            <button onClick={handleAddToWishlist} className="border px-6 py-3 rounded-lg font-bold">Wishlist</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;