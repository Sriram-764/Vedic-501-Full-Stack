const message = "<%= message %>";
const error = "<%= error %>";
if (message) {
  alert(message);
}
if (error) {
  alert(error);
}

// Function to show dialog box for password mismatch
function showPasswordMismatchDialog() {
  alert("Password and Confirm Password must be the same");
}
