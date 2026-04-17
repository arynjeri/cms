/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";

function Payments() {
  const { id } = useParams(); // orderId
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handlePayment = async () => {
    try {
      setLoading(true);
      const res = await API.post(`/customer/payments/${id}/pay`);
      setMessage("Payment initiated. Check your phone to complete STK push.");
    } catch (err) {
      console.error(err);
      setMessage("Payment failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handlePayment();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="p-8 border rounded-lg text-center">
        {loading ? <p>Processing payment...</p> : <p>{message}</p>}
      </div>
    </div>
  );
}

export default Payments;