$(document).ready(function() {
  // Sidebar toggle
  $(".menu-toggle").click(function() {
    $(".sidebar").toggleClass("active");
  });

  // Mobile sidebar toggle (generic fallback)
  $("#menuToggle, .btn-icon").on("click", function() {
    if ($(this).find("i[data-lucide='menu']").length > 0) {
      $("#sidebar").toggleClass("active");
    }
  });

  // Toast auto-hide
  setTimeout(function() {
    $(".toast").fadeOut();
  }, 3000);

  // Smooth hover animations on cards
  $(".card, .cust-card, .stat-card, .inv-card").hover(
    function() {
      $(this).css("transform", "translateY(-2px)");
      $(this).css("transition", "transform 0.2s ease-in-out");
    },
    function() {
      $(this).css("transform", "none");
    }
  );

  // Global AJAX loading indicator
  $(document).ajaxStart(function() {
    $("#loader").show();
  });

  $(document).ajaxStop(function() {
    $("#loader").hide();
  });
});

// Modal control
window.openModal = function() {
  $(".modal, .modal-overlay").fadeIn();
};

window.closeModal = function() {
  $(".modal, .modal-overlay").fadeOut();
};

// Cart updates (POS)
window.updateCartUI = function(total) {
  $("#cart-total").text("₹" + total);
};
