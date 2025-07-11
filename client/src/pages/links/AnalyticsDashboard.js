import axios from "axios";
import { useState, useEffect } from "react";
import { serverEndpoint } from "../../config/config";
import { useParams, useNavigate } from "react-router-dom";
import { DataGrid } from "@mui/x-data-grid";
import { Bar, Pie } from "react-chartjs-2";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
  Title
);

const formatDate = (isoDateString) => {
  if (!isoDateString) return "";

  try {
    const date = new Date(isoDateString);

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch (error) {
    return "";
  }
};

function AnalyticsDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalyticsData] = useState([]);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${serverEndpoint}/links/analytics`, {
        params: {
          linkId: id, // ✅ FIXED typo
          from: fromDate,
          to: toDate,
        },
        withCredentials: true,
      });

      setAnalyticsData(response.data);
    } catch (error) {
      console.log(error);
      navigate("/error");
    }
  };

  const groupBy = (key) => {
    return analytics.reduce((acc, item) => {
      const label = item[key] || "Unknown";
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
  };

  const clicksByCity = groupBy("city");
  const clicksByBrowser = groupBy("browser");

  const columns = [
    { field: "ip", headerName: "IP Address", flex: 1 },
    { field: "city", headerName: "City", flex: 1 },
    { field: "country", headerName: "Country", flex: 1 },
    { field: "region", headerName: "Region", flex: 1 },
    { field: "isp", headerName: "ISP", flex: 1 },
    { field: "deviceType", headerName: "Device", flex: 1 },
    { field: "browser", headerName: "Browser", flex: 1 },
    {
      field: "clickedAt", // ✅ FIXED typo
      headerName: "Clicked At",
      flex: 1,
      renderCell: (params) => <>{formatDate(params.row.clickedAt)}</>,
    },
  ];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="container py-5">
      <h1>Analytics for Link ID: {id}</h1>

      {/* ✅ Date filter UI */}
      <div className="d-flex gap-3 mb-4 align-items-center">
        <DatePicker
          selected={fromDate}
          onChange={(date) => setFromDate(date)}
          placeholderText="From Date"
        />
        <DatePicker
          selected={toDate}
          onChange={(date) => setToDate(date)}
          placeholderText="To Date"
        />
        <button className="btn btn-primary" onClick={fetchAnalytics}>
          Apply Filter
        </button>
      </div>

      {/* ✅ Charts */}
      <div className="row mb-5">
        <div className="col-md-6">
          <h5>Clicks by City</h5>
          <Bar
            data={{
              labels: Object.keys(clicksByCity),
              datasets: [
                {
                  label: "Clicks",
                  data: Object.values(clicksByCity),
                  backgroundColor: "#4e73df",
                },
              ],
            }}
          />
        </div>

        <div className="col-md-6">
          <h5>Clicks by Browser</h5>
          <Pie
            data={{
              labels: Object.keys(clicksByBrowser),
              datasets: [
                {
                  label: "Browsers",
                  data: Object.values(clicksByBrowser),
                  backgroundColor: [
                    "#4e73df",
                    "#1cc88a",
                    "#36b9cc",
                    "#f6c23e",
                    "#e74a3b",
                    "#858796",
                  ],
                },
              ],
            }}
          />
        </div>
      </div>

      {/* ✅ Table */}
      <DataGrid
        getRowId={(row) => row._id}
        rows={analytics}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 20, page: 0 },
          },
        }}
        pageSizeOptions={[20, 50, 100]}
        disableRowSelectionOnClick
        showToolbar
        sx={{ fontFamily: "inherit", height: 600 }}
      />
    </div>
  );
}

export default AnalyticsDashboard;