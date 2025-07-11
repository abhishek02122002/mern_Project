import React from "react";
import { useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { serverEndpoint } from "../../config/config";
import {SET_USER} from '../../redux/user/actions';

const CREDIT_PACKS = [10, 20, 30, 50, 100];
const ManagePayment = () => {
  const user = useSelector((state) => state.userDetails);
  const [error, setError] = useState({});
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const handlePayment = async (credit) => {
    try {
      setLoading(true);

      const orderResponse = await axios.post(
        `${serverEndpoint}/payments/create-order`,{credit},
        {
          withCredentials: true,
        }
      );
      const order = orderResponse.data.order;
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Affiliate++",
        description: `${credit} credit Pack`,
        order_id: order.id,
        theme: {
          color: "#3399cc",
        },
        handler: async (payment) => {
          try {
            await axios.post(
              `${serverEndpoint}/payments/verify-order`,
              {
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_signature: payment.razorpay_signature,
                credit,
              },
              {
                withCredentials: true,
              }
            );
            dispatchEvent({
              type:SET_USER,
              payload:Response.data.user
            })
          } catch (err) {
            console.log(err);
            setMessage({
              message: `unable to verify the order. Please contact to the customer service if the mount is deducted from your account`,
            });
          }
        },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.log(err);
      setError({ message: "unable to prepare order,please try again" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-3">
      {error.message && (
        <div className="alert alert-danger" role="alert">
          {error.message}
        </div>
      )}

      {message && (
        <div className="alert alert-sucess" role="alert">
          {message}
        </div>
      )}

      <h2>Manage Payment</h2>
      <p>
        <strong>Current Balance: {user.credit}</strong>
      </p>
      {CREDIT_PACKS.map((credit) => {
        return (
          <div className="col-auto border m-2 p-2" key={credit}>
            <h4>{credit}</h4>
            <p>
              Buy {credit} credits in INR {credit}
            </p>
            <button
              className="btn btn-outline-primary"
              onClick={() => handlePayment(credit)}
              disabled={loading}
            >
              Buy Now
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ManagePayment;
