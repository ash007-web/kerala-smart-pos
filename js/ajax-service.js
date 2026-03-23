// Sample AJAX data fetching
function fetchSampleData() {
  $.ajax({
    url: "https://jsonplaceholder.typicode.com/posts",
    method: "GET",
    success: function(data) {
      console.log("Fetched data:", data);
    },
    error: function(err) {
      console.error("AJAX error:", err);
    }
  });
}

// Global exposure
window.fetchSampleData = fetchSampleData;
