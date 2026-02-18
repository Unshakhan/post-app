var supabase = window.supabase.createClient('https://romirqjgtqxauwtwbuws.supabase.co', 'sb_publishable_ZB40eb0Xp5UUfechlfD1Rw_khwnI72o')
//signup form ki infosubmit krega ye function
var floatingFirstName;
var floatingLastName;
let editId = null;

function submitInfo(event) {
    event.preventDefault();

    // var postCardContainer = document.getElementById("postCardContainer")
    // postCardContainer.style.display = "block"
     floatingFirstName = document.getElementById("floatingFirstName").value;
     floatingLastName = document.getElementById("floatingLastName").value;
     sessionStorage.setItem("first_name", floatingFirstName);
sessionStorage.setItem("last_name", floatingLastName);

    if (!floatingFirstName || !floatingLastName) {
    alert("Please fill all fields");
    return;
  }
  // 2. Save that user signed up
  sessionStorage.setItem("signedUp", "true");

  // 3. Show posts container, hide signup
  document.getElementById("signUpDiv").classList.add("hidden");
  document.getElementById("postCardContainer").style.display = "block";

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
 // 5. Load posts
  getPosts();
}

// ================= IMAGE SELECT =================
selectedImage = ""
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
    let name = document.getElementById("name")

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

    }else if (img.id === "bg5") {
    //  nav.style.background= "#EEAECA";
    nav.style.background = "radial-gradient(circle, rgba(238,174,202,1) 0%, rgba(148,187,233,1) 100%)";
    btn.style.background = "radial-gradient(circle, rgba(238,174,202,1) 0%, rgba(148,187,233,1) 100%)";
        nav.style.color = "black";
        brand.style.color = "white";
        // name.style.color = "white"

    }else if (img.id === "bg6") {
     nav.style.background = "linear-gradient(135deg, rgb(208, 65, 94) 0%, rgb(208, 65, 94) 20%, rgb(214, 87, 103) calc(20% + 1px), rgb(214, 87, 103) 40%, rgb(219, 121, 113) calc(40% + 1px), rgb(219, 121, 113) 60%, rgb(224, 165, 124) calc(60% + 1px), rgb(224, 165, 124) 80%, rgb(230, 216, 134) calc(80% + 1px), rgb(230, 216, 134) 100%)";
        // nav.style.background = "#7f9962";   // light grey
        nav.style.color = "black";
        brand.style.color = "black";
        // btn.style.background = "#7f9962"
     btn.style.background = "linear-gradient(135deg, rgb(208, 65, 94) 0%, rgb(208, 65, 94) 20%, rgb(214, 87, 103) calc(20% + 1px), rgb(214, 87, 103) 40%, rgb(219, 121, 113) calc(40% + 1px), rgb(219, 121, 113) 60%, rgb(224, 165, 124) calc(60% + 1px), rgb(224, 165, 124) 80%, rgb(230, 216, 134) calc(80% + 1px), rgb(230, 216, 134) 100%)";


    }
}

async function deletePost(id, button) {
  try {
    const {error} = await supabase
  .from('post_crud')
  .delete()
  .eq('id', id)
  //  if (error) console.log("delete error", error);
  
    if (error) {
      throw error; // 🔥 yahin masla solve hota hai
    }
     // button = clicked delete button
    let card = button.closest(".card"); //Jis element par use kiya ho (button)

    //Uske parents / grandparents / great-grandparents tak nearest card div find karega
    card.remove(); // pura card delete
  } catch (error) {
     console.log("Delete failed:", error);
  } 
}
 window.editPost = function (element, id){
var card = element.closest(".card")
var title = card.querySelector("h4");
    var description = card.querySelector("p");
    console.log(title.textContent, description.textContent);
    document.getElementById("topicInput").value = title.textContent
    document.getElementById("commentInput").value = description.textContent
    card.remove()
    editId = id
}

// ================= CREATE POST =================
async function createPost() {
    let firstName = sessionStorage.getItem("first_name");
let lastName  = sessionStorage.getItem("last_name");

console.log("FROM STORAGE:", firstName, lastName);

let title = document.getElementById("topicInput").value.trim();
  let description = document.getElementById("commentInput").value.trim();
  

  if (!title || !description || !selectedImage) {
    Swal.fire({
      icon: "error",
      title: "Empty Post...",
      text: "Enter title & description",
    });
    return;
  }else{
   try{ if(editId){
const { data, error } = await supabase
          .from("post_crud")
          .update({ title, description, image_url: selectedImage , first_name : firstName , last_name : lastName })
          .eq("id",editId)
          .select("*");
          editId = null
    }else{

  const { error } = await supabase
    .from("post_crud")
    .insert([
      {
        title: title,
        description: description,
        image_url: selectedImage,
         first_name: firstName,
    last_name: lastName
      },
    ]);

  if (error) {
    console.log(error);
    alert("Error saving post");
    return;
  }
    }
  }catch (err) {
        console.log(err);
        alert("Something went wrong!");
        return;
    }
}
  alert("Post saved 🎉");
  getPosts();
  }
  
// ================= GET POSTS =================
async function getPosts() {
  const postContainer = document.getElementById("postContainer");
  postContainer.innerHTML = "";

  const { data, error } = await supabase
    .from("post_crud")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.log(error);
    return;
  }

  data.forEach((post) => displayPost(post));
}

// ================= DISPLAY POST =================
function displayPost(post) {
     let firstName = post.first_name || "";
  let lastName  = post.last_name || "";
    
  let html =`
        <div class="card shadow mb-4 p-0" style="background-image:url('${post.image_url}'); background-size:cover;">
            <div class="p-4" style="backdrop-filter: brightness(0.8);">

                <div class="d-flex align-items-center mb-3">

                    <div class="rounded-circle bg-primary text-white d-flex justify-content-center align-items-center"
                         style="width:50px; height:50px; font-size:20px;">
                        ${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}
                    </div>

                    <div class="ms-3">
                        <h5 class="mb-0" id="name">${firstName} ${lastName}</h5>
                        <small class="text-light">${new Date(post.created_at).toLocaleString()}</small>
                    </div>
                </div>

                <h4>${post.title}</h4>
                <p>${post.description}</p>
                 <div class="mt-3 d-flex gap-2 justify-content-end">
                    <button class="btn btn-warning btn-sm" onclick="editPost(this , ${post.id})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deletePost(${post.id} ,this)">Delete</button>
                </div>

            </div>
        </div>
    `;

  document.getElementById("postContainer").innerHTML += html;
}

window.onload = function () {
  const sessionSignedUp = sessionStorage.getItem("signedUp");

  if (sessionSignedUp === "true") {
    // Refresh → signup skipped, show posts
      floatingFirstName = sessionStorage.getItem("first_name");
  floatingLastName  = sessionStorage.getItem("last_name");
    document.getElementById("signUpDiv").classList.add("hidden");
    document.getElementById("postCardContainer").style.display = "block";
    getPosts();
  } else {
    // First visit → show signup form
    document.getElementById("signUpDiv").classList.remove("hidden");
    document.getElementById("postCardContainer").style.display = "none";
  }
};


