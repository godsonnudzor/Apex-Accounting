import React from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/Image/download.jpg";
import Button from "@mui/material/Button";
import { MdMenuOpen } from "react-icons/md";
import AdminHeaderSearchBox from "../Searchbox/AdminHeaderSearchBox";
import { MdOutlineLightMode } from "react-icons/md";
import { MdOutlineShoppingCart } from "react-icons/md";
import { MdEmail } from "react-icons/md";
import { FaRegBell } from "react-icons/fa";
import { useState, useEffect } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Avatar from "@mui/material/Avatar";
import Settings from "@mui/icons-material/Settings";
import Logout from "@mui/icons-material/Logout";
import Divider from "@mui/material/Divider";

const AdminHeader = () => {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isOpennotificationsDrop, setIsOpenNotificationsDrop] = useState(false);
  const openAccDrop = Boolean(anchorEl);
  const openNotificationsDrop = Boolean(isOpennotificationsDrop);

  const handleClickAccDrop = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseAccDrop = () => {
    setAnchorEl(null);
  };
  const handleclickNotifications = (event) => {
    setIsOpenNotificationsDrop(event.currentTarget);
  };
  const handleCloseNotificationsDrop = () => {
    setIsOpenNotificationsDrop(false);
  };

  useEffect(() => {
    // Check if user is logged in
    const loggedInUser = localStorage.getItem("user");
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
      fetchEmployees();
    }
  }, []);

  const fetchEmployees = async () => {
    try {
      const configuredUrl = import.meta.env.VITE_API_BASE?.trim() || import.meta.env.VITE_API_URL?.trim();
      const apiUrl = configuredUrl
        ? `${configuredUrl.replace(/\/$/, '')}/api/users`
        : '/api/users';

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  if (!user) {
    return <div>Please log in to access the dashboard.</div>;
  }

  return (
    <>
      <header className="d-flex align-items-center ">
        <div className="container-fluid w-100">
          <div className="row d-flex align-items-center w-100">
            {/**Logo  */}
            <div className="col-sm-2 part1 ">
              <Link to={"#"} className="d-flex align-items-center logo">
                <img
                  src={logo}
                  alt="Logo"
                  style={{ height: "50px", objectFit: "contain" }}
                />
                <span className="ml-3">DB</span>
              </Link>
            </div>
            <div className="col-sm-3 d-flex align-items-center part2 pl-4">
              <Button className="rounded-circle mr-3">
                <MdMenuOpen />
              </Button>
              <AdminHeaderSearchBox />
            </div>
            <div className="col-sm-7 d-flex align-items-center justify-content-end part3 ">
              <Button className="rounded-circle m-3">
                <MdOutlineLightMode />
              </Button>
              <Button className="rounded-circle m-3">
                <MdOutlineShoppingCart />
              </Button>
              <Button className="rounded-circle m-3">
                <MdEmail />
              </Button>
              <div className="dropDownWrapper position-relative">
                <Button
                  className="rounded-circle m-3"
                  onClick={handleclickNotifications}
                >
                  <FaRegBell />
                </Button>
                <Menu
                  anchorEl={isOpennotificationsDrop}
                  className="notifications dropDown_list"
                  id="notifications"
                  open={openNotificationsDrop}
                  onClose={handleCloseNotificationsDrop}
                  onClick={handleCloseNotificationsDrop}
                  slotProps={{
                    paper: {
                      elevation: 0,
                      sx: {
                        overflow: "visible",
                        filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                        mt: 2.5,
                        maxHeight: 250,
                        // overflow handled by inner .dropdown-scroll

                        "& .MuiAvatar-root": {
                          width: 32,
                          height: 32,
                          ml: 1,
                          mr: 1,
                        },
                        "&::before": {
                          content: '""',
                          display: "block",
                          position: "absolute",
                          top: 0,
                          left: 10,
                          width: 5,
                          height: 10,
                          bgcolor: "background.paper",
                          transform: "translateY(-50%) rotate(45deg)",
                          zIndex: 0,
                        },
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: "left", vertical: "top" }}
                  anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
                >
                  {/* header stays at top; items scroll inside dropdown-scroll */}
                  <div className="head pl-3 pb-0 sticky-header">
                    <h5>Order (12)</h5>
                  </div>
                  <Divider className="mb-3" />
                  <div className="dropdown-scroll">
                    <MenuItem
                      onClick={handleCloseNotificationsDrop}
                      className="note-drop"
                    >
                      <div className="d-flex  ">
                        <span className="rounded-circle">
                          <img
                            className="note-img"
                            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHPJhI9MErIhCaikTZp7z4_
                        pBejSt_OkKZs12CiQ8AZCTyhKYbIuJfA6ZuPyzJJYQ2DNkVccffVoQZlbhfbgipE91jEhsccFURterM2JPo&s=10"
                          />
                        </span>
                      </div>
                      <div className="dropdownInfo">
                        <span>
                          <b>Order received </b>
                          from <b>{user.name}</b>
                        </span>
                        <p className="text-sky mb-0">few seconds ago</p>
                      </div>
                    </MenuItem>
                    <MenuItem
                      onClick={handleCloseNotificationsDrop}
                      className="note-drop"
                    >
                      <div className="d-flex  ">
                        <span className="rounded-circle">
                          <img
                            className="note-img"
                            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHPJhI9MErIhCaikTZp7z4_
                        pBejSt_OkKZs12CiQ8AZCTyhKYbIuJfA6ZuPyzJJYQ2DNkVccffVoQZlbhfbgipE91jEhsccFURterM2JPo&s=10"
                          />
                        </span>
                      </div>
                      <div className="dropdownInfo">
                        <span>
                          <b>Order received </b>
                          from <b>{user.name}</b>
                        </span>
                        <p className="text-sky mb-0">few seconds ago</p>
                      </div>
                    </MenuItem>
                    <MenuItem
                      onClick={handleCloseNotificationsDrop}
                      className="note-drop"
                    >
                      <div className="d-flex  ">
                        <span className="rounded-circle">
                          <img
                            className="note-img"
                            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHPJhI9MErIhCaikTZp7z4_
                        pBejSt_OkKZs12CiQ8AZCTyhKYbIuJfA6ZuPyzJJYQ2DNkVccffVoQZlbhfbgipE91jEhsccFURterM2JPo&s=10"
                          />
                        </span>
                      </div>
                      <div className="dropdownInfo">
                        <span>
                          <b>Order received </b>
                          from <b>{user.name}</b>
                        </span>
                        <p className="text-sky mb-0">few seconds ago</p>
                      </div>
                    </MenuItem>
                    <MenuItem
                      onClick={handleCloseNotificationsDrop}
                      className="note-drop"
                    >
                      <div className="d-flex  ">
                        <span className="rounded-circle">
                          <img
                            className="note-img"
                            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHPJhI9MErIhCaikTZp7z4_
                        pBejSt_OkKZs12CiQ8AZCTyhKYbIuJfA6ZuPyzJJYQ2DNkVccffVoQZlbhfbgipE91jEhsccFURterM2JPo&s=10"
                          />
                        </span>
                      </div>
                      <div className="dropdownInfo">
                        <span>
                          <b>Order received </b>
                          from <b>{user.name}</b>
                        </span>
                        <p className="text-sky mb-0">few seconds ago</p>
                      </div>
                    </MenuItem>
                    <MenuItem
                      onClick={handleCloseNotificationsDrop}
                      className="note-drop"
                    >
                      <div className="d-flex  ">
                        <span className="rounded-circle">
                          <img
                            className="note-img"
                            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHPJhI9MErIhCaikTZp7z4_
                        pBejSt_OkKZs12CiQ8AZCTyhKYbIuJfA6ZuPyzJJYQ2DNkVccffVoQZlbhfbgipE91jEhsccFURterM2JPo&s=10"
                          />
                        </span>
                      </div>
                      <div className="dropdownInfo">
                        <span>
                          <b>Order received </b>
                          from <b>{user.name}</b>
                        </span>
                        <p className="text-sky mb-0">few seconds ago</p>
                      </div>
                    </MenuItem>
                    <MenuItem
                      onClick={handleCloseNotificationsDrop}
                      className="note-drop"
                    >
                      <div className="d-flex  ">
                        <span className="rounded-circle">
                          <img
                            className="note-img"
                            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHPJhI9MErIhCaikTZp7z4_
                        pBejSt_OkKZs12CiQ8AZCTyhKYbIuJfA6ZuPyzJJYQ2DNkVccffVoQZlbhfbgipE91jEhsccFURterM2JPo&s=10"
                          />
                        </span>
                      </div>
                      <div className="dropdownInfo">
                        <span>
                          <b>Order received </b>
                          from <b>{user.name}</b>
                        </span>
                        <p className="text-sky mb-0">few seconds ago</p>
                      </div>
                    </MenuItem>
                    <MenuItem
                      onClick={handleCloseNotificationsDrop}
                      className="note-drop"
                    >
                      <div className="d-flex  ">
                        <span className="rounded-circle">
                          <img
                            className="note-img"
                            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHPJhI9MErIhCaikTZp7z4_
                        pBejSt_OkKZs12CiQ8AZCTyhKYbIuJfA6ZuPyzJJYQ2DNkVccffVoQZlbhfbgipE91jEhsccFURterM2JPo&s=10"
                          />
                        </span>
                      </div>
                      <div className="dropdownInfo">
                        <span>
                          <b>Order received </b>
                          from <b>{user.name}</b>
                        </span>
                        <p className="text-sky mb-0">few seconds ago</p>
                      </div>
                    </MenuItem>
                  </div>
                  <div className="pl-3 pr-2 w-100 pt-1 pb-3">
                    <Button className="btn-blue mb-0 w-100">
                      View All Notifications
                    </Button>
                  </div>
                </Menu>
              </div>
              <div className="myAcc-Wrapper">
                <Button
                  className="myAcc d-flex align-items-center"
                  onClick={handleClickAccDrop}
                >
                  <div className="userImg">
                    <span className="rounded-circle">
                      <img src={logo} />
                    </span>
                  </div>
                  <div className="userInfo">
                    <h4>{user.name}</h4>
                    <p className="mb-0"></p>
                  </div>
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  id="account-menu"
                  open={openAccDrop}
                  onClose={handleCloseAccDrop}
                  onClick={handleCloseAccDrop}
                  slotProps={{
                    paper: {
                      elevation: 0,
                      sx: {
                        overflow: "visible",
                        filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                        mt: 1.5,
                        "& .MuiAvatar-root": {
                          width: 32,
                          height: 32,
                          ml: -0.5,
                          mr: 1,
                        },
                        "&::before": {
                          content: '""',
                          display: "block",
                          position: "absolute",
                          top: 0,
                          right: 14,
                          width: 10,
                          height: 10,
                          bgcolor: "background.paper",
                          transform: "translateY(-50%) rotate(45deg)",
                          zIndex: 0,
                        },
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: "right", vertical: "top" }}
                  anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                >
                  <MenuItem onClick={handleCloseAccDrop}>
                    <Avatar /> My account
                  </MenuItem>
                  <MenuItem onClick={handleCloseAccDrop}>
                    <ListItemIcon>
                      <Settings fontSize="small" />
                    </ListItemIcon>
                    Settings
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <Logout />
                    </ListItemIcon>
                    <span className="text-danger">Logout</span>
                  </MenuItem>
                </Menu>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default AdminHeader;
