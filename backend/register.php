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

// Handling registration
if (isset($_POST['username']) && isset($_POST['password'])) {
    $regUsername = $_POST['username'];
    $regPassword = $_POST['password'];

    // Check if the username already exists
    $checkQuery = "SELECT * FROM users WHERE username='$regUsername'";
    $checkResult = mysqli_query($conn, $checkQuery);

    if (mysqli_num_rows($checkResult) > 0) {
        echo "Username already exists.";
    } else {
        // Insert the new user into the database
        $insertQuery = "INSERT INTO users (username, password) VALUES ('$regUsername', '$regPassword')";
        $insertResult = mysqli_query($conn, $insertQuery);

        if ($insertResult) {
            echo "Registration successful!";
        } else {
            echo "Error: " . $insertQuery . "<br>" . mysqli_error($conn);
        }
    }
}

mysqli_close($conn);
?>
