<?php
// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "praroz";

$conn = mysqli_connect($servername, $username, $password, $dbname);

if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

// Handling login
if (isset($_POST['username']) && isset($_POST['password'])) {
    $loginUsername = $_POST['username'];
    $loginPassword = $_POST['password'];

    // Check if the username and password match
    $loginQuery = "SELECT * FROM users WHERE username='$loginUsername' AND password='$loginPassword'";
    $loginResult = mysqli_query($conn, $loginQuery);

    if (mysqli_num_rows($loginResult) > 0) {
        echo "Login successful!";
    } else {
        echo "Invalid username or password.";
    }
}

