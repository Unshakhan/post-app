import supabase from "./supabase.js";

// ── Auth State ──────────────────────────────────────────────
supabase.auth.onAuthStateChange((event, session) => {
  console.log("Auth Event:", event, session);

  const onForm  = window.location.pathname.includes("form.html");
  const onIndex = window.location.pathname.includes("index.html");

  if (event === 'INITIAL_SESSION') {
    if (!session && onIndex) {
      // Not logged in but on index → go to form, show LOGIN not signup
      sessionStorage.setItem("showLogin", "true");
      window.location.href = "./form.html";
    }
    if (session && onForm) {
      window.location.href = "./index.html";
    }

    // If on form.html, decide which panel to show
    if (onForm) {
      const showLogin = sessionStorage.getItem("showLogin") === "true";
      if (showLogin) {
        sessionStorage.removeItem("showLogin");
        showLoginPanel();
      } else {
        showSignupPanel();
      }
    }

  } else if (event === 'SIGNED_OUT') {
    sessionStorage.clear();
    // Mark that we want login form shown after redirect
    sessionStorage.setItem("showLogin", "true");
    window.location.href = "./form.html";
  }
});

// ── Panel Helpers ────────────────────────────────────────────
function showLoginPanel() {
  document.getElementById("signUpDiv").classList.add("hidden");
  document.getElementById("loginDiv").classList.remove("hidden");
}

function showSignupPanel() {
  document.getElementById("signUpDiv").classList.remove("hidden");
  document.getElementById("loginDiv").classList.add("hidden");
}

// ── Sign Up ──────────────────────────────────────────────────
async function submitInfo(event) {
  event.preventDefault();

  const firstName = document.getElementById("floatingFirstName").value.trim();
  const lastName  = document.getElementById("floatingLastName").value.trim();
  const email     = document.getElementById("floatingInput").value.trim();
  const password  = document.getElementById("floatingPassword").value;

  if (!firstName || !lastName || !email || !password) {
    Swal.fire({ icon: 'warning', title: "Please fill all fields!" });
    return;
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    Swal.fire({ icon: 'error', title: 'Signup Failed', text: error.message });
    return;
  }

  // Store names linked to the user id so we can insert them into posts
  if (data?.user) {
    sessionStorage.setItem("first_name", firstName);
    sessionStorage.setItem("last_name",  lastName);
  }

  Swal.fire({
    title: `Welcome, ${firstName}! 🎉`,
    text: "Account created. Please check your email to confirm (if required).",
    icon: "success",
    confirmButtonText: "Continue",
    customClass: {
      popup: 'custom-popup', title: 'custom-title',
      htmlContainer: 'custom-text', confirmButton: 'custom-btn'
    }
  }).then(() => {
    window.location.href = "./index.html";
  });
}

// ── Login ────────────────────────────────────────────────────
async function login(event) {
  event.preventDefault();

  const email    = document.getElementById("LoginEmail").value.trim();
  const password = document.getElementById("LogInPassword").value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    Swal.fire({ icon: 'error', title: 'Login Failed', text: error.message });
    return;
  }

  // Fetch first/last name from your profiles table if you have one,
  // or just leave blank — posts already store names from when they were created
  Swal.fire({
    icon: 'success',
    title: 'Login Successful!',
    text: "Welcome back!"
  }).then(() => {
    window.location.href = "./index.html";
  });
}

// ── Logout ───────────────────────────────────────────────────
async function logout() {
  sessionStorage.clear();
  const { error } = await supabase.auth.signOut();
  if (error) {
    Swal.fire({ icon: 'error', title: 'Logout Failed', text: error.message });
  }
  // onAuthStateChange SIGNED_OUT will handle redirect
}

// ── Toggle form panels ───────────────────────────────────────
function display() {
  showLoginPanel();
}

// ── Avatar / BG Select ───────────────────────────────────────
var selectedImage = "";

function selectAvatar(img) {
  document.querySelectorAll(".avatar-img").forEach(i => i.style.border = "1px solid #dee2e6");
  img.style.border = "3px solid #0d6efd";
  selectedImage = img.src;

  const nav   = document.getElementById("mainNav");
  const brand = document.getElementById("navBrand");
  const btn   = document.getElementById("savebtn");

  const themes = {
    bg1: { bg: "#57495ea8",          color: "white" },
    bg2: { bg: "radial-gradient(circle, rgba(194,31,2,1) 0%, rgba(199,133,26,1) 51%, rgba(195,58,10,1) 100%)", color: "white" },
    bg3: { bg: "#7e8a66",            color: "white" },
    bg4: { bg: "#7f9962",            color: "black" },
    bg5: { bg: "radial-gradient(circle, rgba(238,174,202,1) 0%, rgba(148,187,233,1) 100%)", color: "black" },
    bg6: { bg: "linear-gradient(135deg, rgb(208,65,94) 0%, rgb(214,87,103) 40%, rgb(219,121,113) 60%, rgb(224,165,124) 80%, rgb(230,216,134) 100%)", color: "black" },
  };

  const theme = themes[img.id];
  if (theme) {
    nav.style.background   = theme.bg;
    nav.style.color        = theme.color;
    brand.style.color      = theme.color;
    btn.style.background   = theme.bg;
  }
}

// ── Create / Update Post ─────────────────────────────────────
let editId = null;

async function createPost() {
  const title       = document.getElementById("topicInput").value.trim();
  const description = document.getElementById("commentInput").value.trim();

  if (!title || !description || !selectedImage) {
    Swal.fire({ icon: "error", title: "Don't leave anything...", text: "Enter title, description and select a background image." });
    return;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) { alert("Please login first"); return; }

  const firstName = sessionStorage.getItem("first_name") || "";
  const lastName  = sessionStorage.getItem("last_name")  || "";

  let dbError;

  if (editId) {
    const { error } = await supabase
      .from("post_crud")
      .update({ title, description, image_url: selectedImage })
      .eq("id", editId)
      .eq("user_id", user.id); // RLS also enforces this
    dbError = error;
    editId = null;
  } else {
    const { error } = await supabase
      .from("post_crud")
      .insert([{ title, description, image_url: selectedImage, first_name: firstName, last_name: lastName, user_id: user.id }]);
    dbError = error;
  }

  if (dbError) { console.log(dbError); alert("Error saving post: " + dbError.message); return; }

  // Clear inputs
  document.getElementById("topicInput").value   = "";
  document.getElementById("commentInput").value = "";
  selectedImage = "";
  document.querySelectorAll(".avatar-img").forEach(i => i.style.border = "1px solid #dee2e6");

  Swal.fire({ icon: "success", title: "Post saved 🎉", timer: 1500, showConfirmButton: false });
  getPosts();
}

// ── Edit Post ────────────────────────────────────────────────
async function editPost(element, id) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) { alert("Login first!"); return; }

  // Verify ownership before letting them edit
  const { data, error } = await supabase
    .from("post_crud")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    Swal.fire({ icon: "error", title: "Not allowed", text: "You can only edit your own posts." });
    return;
  }

  // Populate inputs with existing values
  document.getElementById("topicInput").value   = data.title;
  document.getElementById("commentInput").value = data.description;
  editId = id;

  // Scroll to top so user can see the form
  window.scrollTo({ top: 0, behavior: "smooth" });

  Swal.fire({ icon: "info", title: "Edit mode", text: "Update the fields above and click Save.", timer: 2000, showConfirmButton: false });
}

// ── Delete Post ──────────────────────────────────────────────
async function deletePost(id, button) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) { alert("Please login first!"); return; }

  const confirm = await Swal.fire({
    title: "Delete this post?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete",
    cancelButtonText: "Cancel"
  });
  if (!confirm.isConfirmed) return;

  const { data, error } = await supabase
    .from("post_crud")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select();

  if (error) { console.log("Delete error:", error); return; }

  if (!data || data.length === 0) {
    Swal.fire({ icon: "error", title: "Not allowed", text: "You can only delete your own posts." });
    return;
  }

  button.closest(".card").remove();
}

// ── Get & Display Posts ──────────────────────────────────────
async function getPosts() {
  const postContainer = document.getElementById("postContainer");
  if (!postContainer) return;
  postContainer.innerHTML = "";

  const { data, error } = await supabase
    .from("post_crud")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { console.log(error); return; }
  data.forEach(displayPost);
}

function displayPost(post) {
  const firstName = post.first_name || "";
  const lastName  = post.last_name  || "";

  const html = `
    <div class="card shadow mb-4 p-0" style="background-image:url('${post.image_url}'); background-size:cover;">
      <div class="p-4" style="backdrop-filter: brightness(0.8);">
        <div class="d-flex align-items-center mb-3">
          <div class="rounded-circle bg-primary text-white d-flex justify-content-center align-items-center"
               style="width:50px; height:50px; font-size:20px;">
            ${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}
          </div>
          <div class="ms-3">
            <h5 class="mb-0 text-white">${firstName} ${lastName}</h5>
            <small class="text-light">${new Date(post.created_at).toLocaleString()}</small>
          </div>
        </div>
        <h4 class="text-white">${post.title}</h4>
        <p class="text-white">${post.description}</p>
        <div class="mt-3 d-flex gap-2 justify-content-end">
          <button class="btn btn-warning btn-sm" onclick="editPost(this, ${post.id})">Edit</button>
          <button class="btn btn-danger btn-sm"  onclick="deletePost(${post.id}, this)">Delete</button>
        </div>
      </div>
    </div>`;

  document.getElementById("postContainer").innerHTML += html;
}

// ── On Load ──────────────────────────────────────────────────
window.onload = function () {
  const postCardContainer = document.getElementById("postCardContainer");
  if (postCardContainer) {
    postCardContainer.style.display = "block";
    getPosts();
  }
};

async function myPosts() {
  try{
  const { data , error } = await supabase.auth.getUser()
  if(error || !data){
    alert("pls login first")
    return
  }
  console.log(data);
    const {data : postData , error: postError} = await supabase.from("post_crud").select("*").eq("user_id",data.user.id).order("id", { ascending: false });
  if(postError){
    console.log("Error fetching Posts", postError);
    alert("Error fetching Posts")
    return
  }
  console.log(postData);
  
  const posts = document.getElementById("postContainer");
  posts.innerHTML = ""
  postData.forEach((post) => {
      var posts = document.getElementById("postContainer");
       const firstName = post.first_name || "";
  const lastName  = post.last_name  || "";
      posts.innerHTML += `
           <div class="card shadow mb-4 p-0" style="background-image:url('${post.image_url}'); background-size:cover;">
      <div class="p-4" style="backdrop-filter: brightness(0.8);">
        <div class="d-flex align-items-center mb-3">
          <div class="rounded-circle bg-primary text-white d-flex justify-content-center align-items-center"
               style="width:50px; height:50px; font-size:20px;">
            ${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}
          </div>
          <div class="ms-3">
            <h5 class="mb-0 text-white">${firstName} ${lastName}</h5>
            <small class="text-light">${new Date(post.created_at).toLocaleString()}</small>
          </div>
        </div>
        <h4 class="text-white">${post.title}</h4>
        <p class="text-white">${post.description}</p>
        <div class="mt-3 d-flex gap-2 justify-content-end">
          <button class="btn btn-warning btn-sm" onclick="editPost(this, ${post.id})">Edit</button>
          <button class="btn btn-danger btn-sm"  onclick="deletePost(${post.id}, this)">Delete</button>
        </div>
      </div>
    </div>`;
    });
  } catch (error) {
    console.error("Error in myPosts:", error);
  }
}

async function  search(){
  const searchVal = document.getElementById("searchVal").value.trim();
  const post = document.getElementById("postContainer");
  post.innerHTML = ""
  if(!searchVal){
    alert("Please enter a search term");
    return;
  }
  try {
       let query = supabase
      .from("post_crud")
      .select("*")
      .order("id", { ascending: false });
    if(searchVal){
        query = query.or(
        `title.ilike.%${searchVal}%, description.ilike.%${searchVal}%`,
      );}
      const { data, error } = await query;
        console.log(data);
   if (!data || data.length === 0) {
  postContainer.innerHTML = `
    <div class="text-center mt-5">
      <img src="https://cdn.dribbble.com/userupload/24450589/file/original-7a69eb5b87401ce59325c3291535aebc.gif" 
           alt="No posts found" width="250px" style="border-radius: 20px;"/>
      <h4 class="mt-3">No Posts Found!!!</h4>
      <p class="text-muted">Try searching something else...</p>
    </div>`;
  return;
}
    data.forEach((post) => {
      var posts = document.getElementById("postContainer");
      const firstName = post.first_name || "";
  const lastName  = post.last_name  || "";
      posts.innerHTML += `
           <div class="card shadow mb-4 p-0" style="background-image:url('${post.image_url}'); background-size:cover;">
      <div class="p-4" style="backdrop-filter: brightness(0.8);">
        <div class="d-flex align-items-center mb-3">
          <div class="rounded-circle bg-primary text-white d-flex justify-content-center align-items-center"
               style="width:50px; height:50px; font-size:20px;">
            ${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}
          </div>
          <div class="ms-3">
            <h5 class="mb-0 text-white">${firstName} ${lastName}</h5>
            <small class="text-light">${new Date(post.created_at).toLocaleString()}</small>
          </div>
        </div>
        <h4 class="text-white">${post.title}</h4>
        <p class="text-white">${post.description}</p>
        <div class="mt-3 d-flex gap-2 justify-content-end">
          <button class="btn btn-warning btn-sm" onclick="editPost(this, ${post.id})">Edit</button>
          <button class="btn btn-danger btn-sm"  onclick="deletePost(${post.id}, this)">Delete</button>
        </div>
      </div>
    </div>`;
    });
    if (error) {
      console.error("Search error:", error);
      alert("Error performing search: " + error.message);
    }
}catch (error) {
    console.error("Search error:", error);
    alert("Error performing search");
  }}

// ── Globals ──────────────────────────────────────────────────
window.display     = display;
window.logout      = logout;
window.submitInfo  = submitInfo;
window.selectAvatar = selectAvatar;
window.createPost  = createPost;
window.deletePost  = deletePost;
window.login       = login;
window.editPost    = editPost;
window.myPosts     = myPosts;
window.search     = search;