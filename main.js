let slideIndex = 0;

function showSlides() {
  let i;
  let slides = document.querySelectorAll('.intro-slideshow .slide');
  let dots = document.querySelectorAll('.intro-dots .dot');
  
  slides.forEach((slide) => {
    slide.style.display = "none";
  });

  dots.forEach((dot) => {
    dot.className = dot.className.replace(" active", "");
  });

  slideIndex++;
  if (slideIndex > slides.length) {
    slideIndex = 1;
  }
  
  slides[slideIndex - 1].style.display = "block";
  dots[slideIndex - 1].className += " active";
  
  setTimeout(showSlides, 4000); // Change slide every 4 seconds
}
showSlides();

function currentSlide(n) {
  slideIndex = n - 1;
  showSlides();
}