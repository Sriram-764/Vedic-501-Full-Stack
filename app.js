/* eslint-disable no-unused-vars */
const express = require("express");
const app = express();
const { Registers, Events, eventRegisters } = require("./models");
const session = require("express-session");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const http = require("http");

var csrf = require("csurf");
var cookieParser = require("cookie-parser");

const authenticateUser = (request, response, next) => {
  if (request.session.user) {
    next();
  } else {
    response.redirect("/login");
  }
};

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "game_scheduler_dev",
  password: "sriram",
  port: 5432,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use("/css", express.static(__dirname + "/public/css"));
app.use("/js", express.static(__dirname + "/public/js"));
app.use("/images", express.static(__dirname + "/public/images"));
app.use(
  session({
    secret: "This_is_a_secret_key_2658752",
    resave: false,
    saveUninitialized: true,
  }),
);
app.use(cookieParser("This is a secrete String!!"));
app.use(csrf({ cookie: true }));

app.set("view engine", "ejs");
app.set("views", "./views");

app.get("/", (request, response) => {
  response.render("login", { title: "Login", csrfToken: request.csrfToken() });
});

app.get("/login", (request, response) => {
  response.render("login", { title: "Login", csrfToken: request.csrfToken() });
});

app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "SignUp",
    csrfToken: request.csrfToken(),
  });
});

app.post("/login", async (request, response) => {
  try {
    const user = await Registers.loginUser({
      email: request.body.email,
      password: request.body.password,
    });
    if (!user) response.redirect("/login");
    else {
      console.log("User Login Successfull");
      request.session.user = {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
      };
      if (user.email === "sriram123.boppe@gmail.com")
        response.redirect("/adminDashboard");
      else response.redirect("/dashboard");
    }
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.post("/signup", async (request, response) => {
  console.log("Registering a user: ", request.body);
  try {
    if (request.body.pass === request.body.cPass) {
      const user = await Registers.registerUser({
        fullname: request.body.name,
        email: request.body.Email,
        password: request.body.pass,
      });
      response.redirect("/login");
    } else {
      return response
        .status(400)
        .json({ error: "Password and Confirm Password must be the same" });
    }
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/logout", (request, response) => {
  console.log("user logged out successfully");
  response.redirect("/login");
});

app.get("/adminDashboard", authenticateUser, async (request, response) => {
  const { user } = request.session;
  if (!user) {
    return response.redirect("/login");
  }
  const events = await Events.findAll({
    where: {
      eventUserId: user.id,
    },
  });
  response.render("adminDashboard", {
    name: user.fullname,
    events,
    csrfToken: request.csrfToken(),
  });
});

app.get("/dashboard", authenticateUser, async (request, response) => {
  console.log("Getting the dashboard");
  const { user } = request.session;
  const events = await eventRegisters.findAll({
    where: {
      userId: user.id,
    },
  });
  let eventList = [];
  for (const event of events) {
    const details = await Events.findOne({
      where: {
        id: event.eventId,
      },
    });
    if (details) {
      eventList.push(details);
      console.log(details.id);
    }
  }
  response.render("dashboard", {
    name: user.fullname,
    eventList,
    csrfToken: request.csrfToken(),
  });
});

app.get("/allEvents", authenticateUser, async (request, response) => {
  const { user } = request.session;
  try {
    const events = await Events.findAll();
    let link = "dashboard";
    if (user.email === "sriram123.boppe@gmail.com") link = "adminDashboard";
    response.render("allEvents", { events, link });
  } catch (error) {
    console.error(error);
    response.status(500).send("Internal Server Error");
  }
});

app.get("/addEvent", authenticateUser, async (request, response) => {
  response.render("addEvent", { csrfToken: request.csrfToken() });
});

app.post("/addEvent", authenticateUser, async (request, response) => {
  try {
    await Events.create({
      eventUserId: request.session.user.id,
      eventImg: request.body.image,
      eventTitle: request.body.title,
      eventDesc: request.body.desc,
      eventVenue: request.body.loc,
      eventCapacity: request.body.capacity,
      eventStartDate: request.body.eventDate,
      eventTime: request.body.time,
      eventEndDate: request.body.endDate,
    });
    response.redirect("/allEvents");
  } catch (err) {
    console.log(err);
    response.status(500).send("Internal Server Error");
  }
});

app.get("/viewEvent/:id", authenticateUser, async (request, response) => {
  const { user } = request.session;
  const eventDetails = await Events.findOne({
    where: {
      id: request.params.id,
    },
  });
  const eventid = eventDetails.id;
  const yes = await eventRegisters.findOne({
    where: {
      userId: user.id,
      eventId: eventid,
    },
  });
  let registered = true;
  if (yes) registered = false;
  console.log(request.params.id);
  let flag = 0;
  if (user.email === "sriram123.boppe@gmail.com") flag = 1;
  response.render("viewEvent", { eventDetails, flag, registered });
});

app.get("/deleteEvent/:id", authenticateUser, async (request, response) => {
  const events = await Events.destroy({
    where: {
      id: request.params.id,
    },
  });
  console.log("Deleted Successfully");
  response.redirect("/allEvents");
});

app.get(
  "/registeredMembers/:eid",
  authenticateUser,
  async (request, response) => {
    const { user } = request.session;
    const members = await eventRegisters.findAll({
      where: {
        eventId: request.params.eid,
      },
    });

    let memberList = [];
    for (const member of members) {
      const details = await Registers.findOne({
        where: {
          id: member.userId,
        },
      });
      if (details) {
        memberList.push(details);
        console.log(details.id);
      }
    }
    const eventDetails = await Events.findOne({
      where: {
        id: request.params.eid,
      },
    });
    response.render("registeredMembers", {
      name: user.fullname,
      members,
      memberList,
      eventDetails,
    });
  },
);

app.get("/registerEvent/:eid", authenticateUser, async (request, response) => {
  try {
    const { user } = request.session;
    const member = await eventRegisters.create({
      userId: user.id,
      eventId: request.params.eid,
    });
    console.log("Registered to the event successfully");
    response.redirect("/dashboard");
  } catch (error) {
    console.log("Internal error occured!");
    response.status(400).json({ error: "Oops! Something went wrong!!" });
  }
});

app.get(
  "/unRegisterEvent/:eid",
  authenticateUser,
  async (request, response) => {
    try {
      const { user } = request.session;
      const event = await eventRegisters.destroy({
        where: {
          userId: user.id,
          eventId: request.params.eid,
        },
      });
      console.log("Deleted Successfully!");
      response.redirect("/dashboard");
    } catch (error) {
      response.status(400).json({ error: "Oops! Something went wrong!!" });
    }
  },
);

module.exports = app;
