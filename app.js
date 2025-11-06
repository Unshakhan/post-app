
//signup form ki infosubmit krega ye function
function submitInfo(event) {
    event.preventDefault();
    
var postCardContainer = document.getElementById("postCardContainer")
postCardContainer.style.display = "block"
    let floatingFirstName = document.getElementById("floatingFirstName").value;
    let floatingLastName = document.getElementById("floatingLastName").value;
Swal.fire({
  title: `Welcome, ${floatingFirstName}! 🎉`,
  text: "Your account has been created.",
  icon: "success",
  confirmButtonText: "Continue",
  draggable: true,
  
  // ✅ Background styling
  background: "rgba(255, 255, 255, 0.95)",
  backdrop: `
    rgba(0, 0, 0, 0.73)
  `,

  // ✅ Custom popup class
  customClass: {
    popup: 'custom-popup',
    title: 'custom-title',
    htmlContainer: 'custom-text',
    confirmButton: 'custom-btn'
  }
});


    document.getElementById("signUpDiv").classList.add("hidden");

}


selectedImage=""
function selectAvatar(img) {

    let allImages = document.getElementsByClassName("avatar-img");
// console.log(allImages);

    for (let i = 0; i < allImages.length; i++) {
        allImages[i].style.border = "1px solid #dee2e6";
    }

    img.style.border = "3px solid #0d6efd";

    selectedImage = img.src;
     let nav = document.getElementById("mainNav");
    let brand = document.getElementById("navBrand");
    let btn = document.getElementById("savebtn")

    // ✅ SIMPLE IF–ELSE THEMES
    if (img.id === "bg1") {
        nav.style.background = "#57495ea8";   // dark blue 
        nav.style.color = "white";
        brand.style.color = "white";
        btn.style.background = "#57495ea8"
    } else if (img.id === "bg2") {
       nav.style.background = `radial-gradient(circle, rgba(194,31,2,1) 0%, rgba(199,133,26,1) 51%, rgba(195,58,10,1) 100%)`;
        nav.style.color = "white";
        brand.style.color = "white";
         btn.style.background = `radial-gradient(circle, rgba(194,31,2,1) 0%, rgba(199,133,26,1) 51%, rgba(195,58,10,1) 100%)`
    } else if (img.id === "bg3") {
        nav.style.background = "#7e8a66";   // purple
        nav.style.color = "white";
        brand.style.color = "white";
         btn.style.background = "#7e8a66"

    } else if (img.id === "bg4") {
        nav.style.background = "#7f9962";   // light grey
        nav.style.color = "black";
        brand.style.color = "black";
         btn.style.background = "#7f9962"

    }
}

function deletePost(button) {
    // button = clicked delete button
    let card = button.closest(".card"); //Jis element par use kiya ho (button)

//Uske parents / grandparents / great-grandparents tak nearest card div find karega
    card.remove(); // pura card delete
}


function createPost() {

    let topic = document.getElementById("topicInput").value;
    let comment = document.getElementById("commentInput").value;

    let firstName = document.getElementById("floatingFirstName").value;
    let lastName = document.getElementById("floatingLastName").value;

    let time = new Date().toLocaleString();//it return readable time 

    if (selectedImage==="") {
        alert("Please select a background image!");
        return;
    }

    let postHTML = `
        <div class="card shadow mb-4 p-0" style="background-image:url('${selectedImage}'); background-size:cover;">
            <div class="p-4" style="backdrop-filter: brightness(0.8);">

                <div class="d-flex align-items-center mb-3">

                    <div class="rounded-circle bg-primary text-white d-flex justify-content-center align-items-center"
                         style="width:50px; height:50px; font-size:20px;">
                        ${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}
                    </div>

                    <div class="ms-3">
                        <h5 class="mb-0">${firstName} ${lastName}</h5>
                        <small class="text-light">${time}</small>
                    </div>
                </div>

                <h4>${topic}</h4>
                <p>${comment}</p>
                 <div class="mt-3 d-flex gap-2 justify-content-end">
                    <button class="btn btn-warning btn-sm" onclick="editPost(this)">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deletePost(this)">Delete</button>
                </div>

            </div>
        </div>
    `;

    document.getElementById("postContainer").innerHTML += postHTML;

}

