const fs = require("fs");
const bodyParser = require("body-parser");
const jsonServer = require("json-server");
const jwt = require("jsonwebtoken");

const server = jsonServer.create();

const router = jsonServer.router("./db.json");

const db = JSON.parse(fs.readFileSync("./db.json", "UTF-8"));

const middlewares = jsonServer.defaults();
const PORT = process.env.PORT || 3000;

server.use(middlewares);

server.use(jsonServer.defaults());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

const SECRET_KEY = "123456789";
const expiresIn = "1h";

function createToken(payload) {
    return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

function verifyToken(token) {
    return jwt.verify(token, SECRET_KEY, (err, decode) =>
        decode !== undefined ? decode : err
    );
}

function isAuthenticated({ email, password }) {
    return (
        db.users.findIndex(
            (user) => user.email === email && user.password === password
        ) !== -1
    );
}

server.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    exist_user = db.users.findIndex((x) => x.email === email);
    if (exist_user !== -1) {
        return res.status(401).json({
            status: 401,
            message: "Email already in use!",
        });
    }

    const new_user = {
        id: db.users.length + 1,
        username,
        email,
        password,
    };

    await db.users.push(new_user);
    fs.writeFileSync("./db.json", JSON.stringify(db), () => {
        if (err) return console.log(err);
        console.log("writing to " + fileName);
    });
    res.status(201).json({
        status: 201,
        message: "Success",
        data: new_user,
    });
});

//login
server.post("/login", async (req, res) => {
    // const {email, password} = req.body
    const email = req.body.email;
    const password = req.body.password;

    if (isAuthenticated({ email, password }) === false) {
        const status = 401;
        const message = "Incorrect email or password";
        res.status(status).json({ status, message });
        return;
    }
    const access_token = await createToken({ email, password });
    res.status(200).json({
        status: 200,
        message: "Success",
        data: {
            access_token,
        },
    });
});

server.use("/auth", (req, res, next) => {
    if (
        req.headers.authorization == undefined ||
        req.headers.authorization.split(" ")[0] !== "Bearer"
    ) {
        const status = 401;
        const message = "Bad authorization header";
        res.status(status).json({ status, message });
        return;
    }
    try {
        let verifyTokenResult;
        verifyTokenResult = verifyToken(req.headers.authorization.split(" ")[1]);

        if (verifyTokenResult instanceof Error) {
            const status = 401;
            const message = "Error: access_token is not valid";
            res.status(status).json({ status, message });
            return;
        }
        next();
    } catch (err) {
        const status = 401;
        const message = "Token is our of date.";
        res.status(status).json({ status, message });
    }
});

//view all users
server.get("/auth/users", (req, res) => {
    res.status(200).json({
        status: 200,
        data: {
            users: db.users,
        },
    });
});

//view user by email
server.get("/auth/users/:email", (req, res) => {
    const email = req.params.email;

    const exist_email = db.users.findIndex((user) => user.email == email);
    const result = db.users.filter((user) => user.email == email);
    if (exist_email !== -1) {
        const status = 200;
        return res.status(status).json({ status, result });
    } else {
        return res.status(401).json({
            status: 401,
            message: "Email is not found!!",
        });
    }
});

server.delete('/auth/users/:email', async (req, res) => {
    const email = req.params.email;
    const exist_email = db.users.findIndex((user) => user.email === email);
    if (exist_email !== -1) {
        db.users.splice(exist_email, 1)
        await fs.writeFileSync("./db.json", JSON.stringify(db), () => {
            if (err) return console.log(err);
            console.log("writing to " + fileName);
        });
        return res.status(204).json({
            status: 204,
            message: "Successfully!"
        });
    }
    return res.status(401).json({
        status: 401,
        message: "User doesn't exist!",
    });
})

server.get('/auth/orders', (req, res) => {
    res.status(200).json({
        status: 200,
        data: {
            users: db.orders,
        },
    });
})

server.get('/auth/orders/:orderId', async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const exist_order = await db.orders.findIndex((x) => x.id === orderId)
    if (exist_order !== -1) {
        return res.status(200).json({
            status: 200,
            data: {
                users: db.orders[exist_order],
            },
        });
    }
    return res.status(401).json({
        status: 401,
        message: "Order doesn't exist!",
    });
})

server.delete('/auth/orders/:orderId', async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const exist_order = await db.orders.findIndex((x) => x.id === orderId)
    if (exist_order !== -1) {
        db.orders.splice(exist_order, 1)
        await fs.writeFileSync("./db.json", JSON.stringify(db), () => {
            if (err) return console.log(err);
            console.log("writing to " + fileName);
        });
        return res.status(204).json({
            status: 204,
            message: "Successfully!"
        });
    }
    return res.status(401).json({
        status: 401,
        message: "Order doesn't exist!",
    });
})

server.post('/auth/orders', async (req, res) => {
    const { bookId, customerName } = req.body;

    const exist_book = await db.books.findIndex((x) =>
        x.id === bookId
    )
    if (exist_book === -1) {
        return res.status(401).json({
            status: 401,
            message: "Book doesn't exist!",
        })
    } else {
        const check_book_stock = db.books[exist_book]
        if (check_book_stock.available === false) {
            return res.status(401).json({
                status: 401,
                message: "Book out of stock!",
            })
        } else {
            const exist_order = await db.orders.findIndex((x) => x.bookId === bookId && x.customerName == customerName);
            if (exist_order !== -1) {
                const existingOrder = db.orders[exist_order];
                existingOrder.quantity += 1;
                db.orders[exist_order] = existingOrder;
                res.status(201).json({
                    status: 201,
                    message: "Success",
                    data: existingOrder
                });
            } else {
                const quantity = 1
                const timestamp = new Date()
                const new_order = {
                    id: db.orders.length + 1,
                    bookId,
                    customerName,
                    quantity,
                    timestamp
                };
                db.orders.push(new_order);
                res.status(201).json({
                    status: 201,
                    message: "Success",
                    data: new_order
                });
            }
        }
    }
    await fs.writeFileSync("./db.json", JSON.stringify(db), () => {
        if (err) return console.log(err);
        console.log("writing to " + fileName);
    });
})

server.patch('/auth/orders/:orderId', async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const { customerName } = req.body
    const exist_order = await db.orders.findIndex((x) => x.id === orderId);
    if (exist_order !== -1) {
        const existingOrder = db.orders[exist_order];
        existingOrder.customerName = customerName;
        db.orders[exist_order] = existingOrder;

        await fs.writeFileSync("./db.json", JSON.stringify(db), () => {
            if (err) return console.log(err);
            console.log("writing to " + fileName);
        });

    } else {
        return res.status(401).json({
            status: 401,
            message: "Order doesn't exist!",
        })
    }

    res.status(201).json({
        status: 201,
        message: "Success",
    });
})

//DO SOMETHING
//END

server.use(router);

server.listen(PORT, () => {
    console.log("Run Auth API Server");
});