//signup form ki infosubmit krega ye function
function submitInfo(event) {
    event.preventDefault();

    let floatingFirstName = document.getElementById("floatingFirstName").value;
    let floatingLastName = document.getElementById("floatingLastName").value;

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

            </div>
        </div>
    `;

    document.getElementById("postContainer").innerHTML = postHTML;

}

