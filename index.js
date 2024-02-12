const express = require("express");
const app = express();
const { Registers, Events, eventRegisters } = require("./models");
const session = require("express-session");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

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
  })
);

app.set("view engine", "ejs");
app.set("views", "./views");

app.get("/", (request, response) => {
  response.render("login", { title: "Login" });
});

app.get("/login", (request, response) => {
  response.render("login", { title: "Login" });
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
      return response.json(user);
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

app.post("/login", async (request, response) => {
  try {
    const user = await Registers.loginUser({
      email: request.body.email,
      password: request.body.password,
    });
    console.log("User Login Successfull");
    request.session.user = {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
    };
    response.redirect("/dashboard");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/logout", (request, response) => {
  console.log("user logged out successfully");
  response.redirect("/login");
});

app.get("/dashboard", async (request, response) => {
  const { user } = request.session;
  if (!user) {
    return response.redirect("/login");
  }
  console.log(user.fullname);
  const events = await await Events.findAll({
    where: {
      eventUserId: user.id,
    },
  });
  response.render("dashboard", { name: user.fullname, events });
});

app.get("/signup", (request, response) => {
  response.render("signup", { title: "SignUp" });
});

app.get("/allEvents", async (request, response) => {
  try {
    const events = await Events.findAll();
    response.render("allEvents", { events });
  } catch (error) {
    console.error(error);
    response.status(500).send("Internal Server Error");
  }
});

app.get("/addEvent", authenticateUser, async (request, response) => {
  response.render("addEvent");
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

app.get("/viewEvent/:id", async (request, response) => {
  const eventDetails = await Events.findOne({
    where: {
      id: request.params.id,
    },
  });
  console.log(request.params.id);
  response.render("viewEvent", { eventDetails });
});

app.get("/deleteEvent/:id", async (request, response) => {
  const events = await Events.destroy({
    where: {
      id: request.params.id,
    },
  });
  console.log("Deleted Successfully");
  response.redirect("/allEvents");
});

app.listen(3000, () => {
  console.log("Server listening at the port 3000");
});
