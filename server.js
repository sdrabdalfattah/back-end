const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require('cors');



const app = express();
app.use(express.json());

const secret = "mySecretKey";



app.use(cors());
const DB_URI = "mongodb+srv://mopokdh:20081230abddet@cluster0.hs4bb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose
  .connect(DB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));
const User = require("./models/user"); 
const Todo = require("./models/todo"); 







app.post("/register", async (req, res) => {
  try {
    let { email, name, password } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "The email must be valid." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "The password must be at least 6 characters long." });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Cannot use that email, it is already registered." });
    }

    // حفظ المستخدم الجديد
    const newUser = new User({ email, name, password });
    await newUser.save();

    // 🔥 إنشاء التوكن مباشرة بعد التسجيل
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      secret,
      { expiresIn: "30d" }
    );

    res.json({
      message: "Registered successfully!",
      token,  // ✅ إرسال التوكن بعد التسجيل
      user: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.name
      }
    });
  } catch (error) {
    console.error("❌ خطأ في التسجيل:", error);
    res.status(500).json({ error: "Cannot register user." });
  }
});









app.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ error: "User not found." });
    }
    if (password !== existingUser.password) {
      return res.status(400).json({ error: "Incorrect password." });
    }

    // ✅ إنشاء التوكن
    const token = jwt.sign(
      { id: existingUser._id, email: existingUser.email },
      secret,
      { expiresIn: "30d" }
    );

    res.json({
      message: "Login successful",
      token,  // ✅ إرسال التوكن بعد تسجيل الدخول
      user: {
        id: existingUser._id,
        email: existingUser.email,
        username: existingUser.name
      }
    });

  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});







function authenticateToken(req, res, next) {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access Denied" });
  }
  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid Token" });
    }
    req.user = user; 
    next(); 
  });
}







app.post("/new-todo", authenticateToken, async (req, res) => {
  try {
    const { userId, task } = req.body;
    if (!userId || !task.trim()) {
      return res.status(400).json({ error: "User ID and task are required" });
    }
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: "User not found" });
    }
    const newTodo = new Todo({ userId, task });
    await newTodo.save();
    res.json({ message: "Task added!", todo: newTodo });
  } catch (error) {
    console.error("❌ خطأ:", error);
    res.status(500).json({ error: "Cannot add task." });
  }
});






app.get("/my-todos",authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query; // استخدام req.query بدلاً من req.body في GET
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: "User not found" });
    }
    const todos = await Todo.find({ userId }); // جلب المهام المرتبطة بالمستخدم
    return res.status(200).json({ todos });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
});











app.put("/edit_todo",authenticateToken, async (req, res) => {
  try {
    const { todoId, newTask } = req.body; // استلام القيم الجديدة
    if (!todoId || !newTask) {
      return res.status(400).json({ error: "Todo ID and new task content are required" });
    }
    const updatedTodo = await Todo.findByIdAndUpdate(
      todoId,
      { task: newTask },
      { new: true }
    );
    if (!updatedTodo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    return res.status(200).json({ message: "Todo edited successfully", updatedTodo });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
});






app.delete("/delete-todo",authenticateToken, async (req, res) => {
  try {
const { todoId } = req.body;
if (!todoId) {
  return res.status(400).json({ error: "Task ID is required" });
}
const deletedTodo = await Todo.findByIdAndDelete(todoId);
if (!deletedTodo) {
  return res.status(404).json({ error: "Todo not found" });
}
return res.status(200).json({ message: "Todo deleted successfully" });
  } catch (error) {

    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
});





app.get("/all_users", async (req, res) => {
  try {
    const users = await User.find();
    res.json({ message: "Registered users:", users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});







app.delete("/clear-database", async (req, res) => {
  try {
    await Todo.deleteMany({});  
    await User.deleteMany({});  
    return res.status(200).json({ message: "Database cleared successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
});



const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/`);
});
