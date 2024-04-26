import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Productwish() {
  const { id } = useParams(); // Get the ID from the URL
  const nav = useNavigate();
  const userID = localStorage.getItem('userID');
  const notifySuccess = (message) => toast.success(message);
  const notifyError = (message) => toast.error(message);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");
      axios.defaults.headers.common["Authorization"] = "Bearer " + token;

      const res = await axios.post(`http://ec2-3-21-35-199.us-east-2.compute.amazonaws.com:8000/user/wishlist/${id}`, {
        userID,
        productID: id,
      });
      notifySuccess("Product added to Wishlist Successfully");
      nav("/user", { replace: true });
    } catch (error) {
      console.error("Error adding product to Wishlist:", error);
      notifyError("Failed to add product to Wishlist. Please try again later.");
      nav("/user", { replace: true });
    }
  };

  // useEffect to submit the form automatically after component mounts
  useEffect(() => {
    handleSubmit({ preventDefault: () => {} }); // Pass an empty preventDefault function to prevent the error
  }, []); // Empty dependency array ensures it runs only once after mount

  return (
    <>
      <form onSubmit={handleSubmit}>
        <button type="submit" style={{ display: "none" }}>Add to Wishlist</button>
      </form>
      <ToastContainer />
    </>
  );
}

export default Productwish;
