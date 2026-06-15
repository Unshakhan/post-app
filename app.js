import supabase from "./supabase.js";
// ── Global Profile Guard ──
(async () => {
  if (window.location.pathname.includes("profile.html")) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "./form.html";
    }
  }
})();
// ── Toast System ────────────────────────────────
function showToast(type = 'success', title = '', message = '', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: '✅',
    error:   '❌',
    info:    'ℹ️',
    warning: '⚠️'
  };

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '💬'}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>
    <button class="toast-close" onclick="dismissToast(this.parentElement)">✕</button>
    <div class="toast-progress" style="animation-duration:${duration}ms"></div>
  `;

  container.appendChild(toast);

  // Auto dismiss
  setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
  if (!toast || toast.classList.contains('hiding')) return;
  toast.classList.add('hiding');
  setTimeout(() => toast.remove(), 350);
}

window.showToast    = showToast;
window.dismissToast = dismissToast;

// ── Auth State ──────────────────────────────────────────────
supabase.auth.onAuthStateChange(async (event, session) => {
  const onForm  = window.location.pathname.includes("form.html");
  const onIndex = window.location.pathname.includes("index.html");
  const onAdmin = window.location.pathname.includes("admin.html");

  if (event === 'INITIAL_SESSION') {
    if (!session) {
      // Not logged in
      if (onIndex || onAdmin) {
        sessionStorage.setItem("showLogin", "true");
        window.location.href = "./form.html";
      }
      if (onForm) {
        const showLogin = sessionStorage.getItem("showLogin") === "true";
        if (showLogin) { sessionStorage.removeItem("showLogin"); showLoginPanel(); }
        else showSignupPanel();
      }
      return;
    }

    // Logged in — check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, first_name, last_name")
      .eq("id", session.user.id)
      .single();

    const role = profile?.role || "user";
    sessionStorage.setItem("role", role);
    if (profile?.first_name) sessionStorage.setItem("first_name", profile.first_name);
    if (profile?.last_name)  sessionStorage.setItem("last_name",  profile.last_name);

    if (role === "admin") {
      // Admin: only allowed on admin.html
      if (onForm || onIndex) {
        window.location.href = "./admin.html";
        return;
      }
    } else {
      // Normal user: not allowed on admin.html
      if (onAdmin) {
        window.location.href = "./index.html";
        return;
      }
      // If on form, send to index
      if (onForm) {
        window.location.href = "./index.html";
        return;
      }
    }

    // Correct page, do nothing — let page load
    if (onForm) {
      // Edge case: form page loaded but session exists (handled above)
    }

  } else if (event === 'SIGNED_OUT') {
    sessionStorage.clear();
    sessionStorage.setItem("showLogin", "true");
    window.location.href = "./form.html";
  }
});

function showLoginPanel() {
  document.getElementById("signUpDiv").classList.add("hidden");
  document.getElementById("loginDiv").classList.remove("hidden");
}

// ── Sign Up ──────────────────────────────────────────────────
async function submitInfo(event) {
  event.preventDefault();
  const firstName = document.getElementById("floatingFirstName").value.trim();
  const lastName  = document.getElementById("floatingLastName").value.trim();
  const email     = document.getElementById("floatingInput").value.trim();
  const password  = document.getElementById("floatingPassword").value;

  if (!firstName || !lastName || !email || !password) {
    Swal.fire({ icon: 'warning', title: "Please fill all fields!" }); return;
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { Swal.fire({ icon: 'error', title: 'Signup Failed', text: error.message }); return; }

 if (data?.user) {
    // ── Secret admin code check ──
    const adminCodeInput = document.getElementById("adminSecretCode");
    const enteredCode = adminCodeInput ? adminCodeInput.value.trim() : "";
    const ADMIN_SECRET = "ADMIN@2024"; // 🔒 Yeh apna secret code rakho
    const assignedRole = enteredCode === ADMIN_SECRET ? "admin" : "user";

    if (enteredCode && assignedRole !== "admin") {
      Swal.fire({ 
        icon: 'error', 
        title: 'Invalid Admin Code', 
        text: 'Wrong admin code! Signing up as regular user.' 
      });
    }

    // Save to profiles table
    await supabase.from("profiles").insert({
      id: data.user.id,
      first_name: firstName,
      last_name: lastName,
      role: assignedRole
    });
    sessionStorage.setItem("first_name", firstName);
    sessionStorage.setItem("last_name",  lastName);
    sessionStorage.setItem("role", assignedRole); 
  }

  Swal.fire({
    title: `Welcome, ${firstName}! 🎉`,
    text: "Account created successfully.",
    icon: "success", confirmButtonText: "Continue",
  }).then(() => {
  sessionStorage.setItem("isNewUser", "true");
  window.location.href = "./index.html";
});
}

// ── Login ────────────────────────────────────────────────────
async function login(event) {
  event.preventDefault();
  const email    = document.getElementById("LoginEmail").value.trim();
  const password = document.getElementById("LogInPassword").value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { Swal.fire({ icon: 'error', title: 'Login Failed', text: error.message }); return; }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", data.user.id)
    .single();

 if (!profile) {
  // Profile exist nahi — post_crud se name lo aur profile banao
  const { data: postData } = await supabase
    .from("post_crud")
    .select("first_name, last_name")
    .eq("user_id", data.user.id)
    .limit(1)
    .single();

  const firstName = postData?.first_name || "";
  const lastName  = postData?.last_name  || "";

  // Profile insert karo
  await supabase.from("profiles").insert({
    id: data.user.id,
    first_name: firstName,
    last_name: lastName,
    role: "user"
  });

  sessionStorage.setItem("first_name", firstName);
  sessionStorage.setItem("last_name",  lastName);
  sessionStorage.setItem("role", "user");

} else if (profile) {
    // profiles table mein name check karo
    let firstName = profile.first_name || "";
    let lastName  = profile.last_name  || "";

    // Agar profiles mein name nahi — post_crud se lo
    if (!firstName) {
      const { data: postData } = await supabase
        .from("post_crud")
        .select("first_name, last_name")
        .eq("user_id", data.user.id)
        .limit(1)
        .single();

      if (postData) {
        firstName = postData.first_name || "";
        lastName  = postData.last_name  || "";

        // profiles table mein bhi update kar do future ke liye
        await supabase.from("profiles")
          .update({ first_name: firstName, last_name: lastName })
          .eq("id", data.user.id);
      }
    }

    sessionStorage.setItem("first_name", firstName);
    sessionStorage.setItem("last_name",  lastName);
    sessionStorage.setItem("role", profile.role || "user");
  }

showToast('success', 'Login Successful! 🎉', 'Welcome back!');
setTimeout(() => {   
      if (profile?.role === "admin") {
        window.location.href = "./admin.html";
     } else {
        sessionStorage.setItem("showWelcome", "true");
        window.location.href = "./index.html";
      }
    });
}

// ── Logout ───────────────────────────────────────────────────
async function logout() {
  sessionStorage.clear();
  const { error } = await supabase.auth.signOut();
  if (error) Swal.fire({ icon: 'error', title: 'Logout Failed', text: error.message });
}

function display() { showLoginPanel(); }

// ── Avatar / BG Select ───────────────────────────────────────
var selectedImage = "";
function selectAvatar(img) {
  document.querySelectorAll(".avatar-img").forEach(i => i.style.border = "1px solid #dee2e6");
  img.style.border = "3px solid #0d6efd";
  selectedImage = img.src;
  const nav  = document.getElementById("mainNav");
  const sbtn = document.getElementById("savebtn");
  const themes = {
    bg1: { bg: "#57495ea8", color: "white" },
    bg2: { bg: "radial-gradient(circle, rgba(194,31,2,1) 0%, rgba(199,133,26,1) 51%, rgba(195,58,10,1) 100%)", color: "white" },
    bg3: { bg: "#7e8a66",   color: "white" },
    bg4: { bg: "#7f9962",   color: "black" },
    bg5: { bg: "radial-gradient(circle, rgba(238,174,202,1) 0%, rgba(148,187,233,1) 100%)", color: "black" },
    bg6: { bg: "linear-gradient(135deg, rgb(208,65,94) 0%, rgb(214,87,103) 40%, rgb(219,121,113) 60%, rgb(224,165,124) 80%, rgb(230,216,134) 100%)", color: "black" },
  };
  const theme = themes[img.id];
  if (theme) { nav.style.background = theme.bg; nav.style.color = theme.color; sbtn.style.setProperty("background", theme.bg, "important"); }
}

// ── Create / Update Post ─────────────────────────────────────
let editId = null;

async function createPost() {
   const title       = window.topicQuill.getSemanticHTML().trim();
  const description = window.commentQuill.getSemanticHTML().trim();
  const titleText   = window.topicQuill.getText().trim();
  const descText    = window.commentQuill.getText().trim();
  var imageFile = document.getElementById("background-image").files.length > 0
                ? document.getElementById("background-image").files[0] : null;

  if (!titleText || !descText) {
    Swal.fire({ icon: "error", title: "Don't leave anything...", text: "Enter title and description." }); return;
  }
  if (!imageFile && !selectedImage) {
    Swal.fire({ icon: "error", title: "Please select a background image!" }); return;
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) { alert("Please login first"); return; }

  let imageUrl = "";
  if (imageFile) {
    let fileName = `${Date.now()}-${imageFile.name}`;
    const { error: uploadError } = await supabase.storage.from("background-images")
      .upload(fileName, imageFile, { cacheControl: "3600", upsert: false });
    if (uploadError) { alert("Image upload failed 🚩"); return; }
    const { data: publicUrlData } = supabase.storage.from("background-images").getPublicUrl(fileName);
    imageUrl = publicUrlData.publicUrl;
  } else { imageUrl = selectedImage; }

  const firstName = sessionStorage.getItem("first_name") || "";
  const lastName  = sessionStorage.getItem("last_name")  || "";
  let dbError;

  if (editId) {
    const { error } = await supabase.from("post_crud")
      .update({ title, description, image_url: imageUrl })
      .eq("id", editId).eq("user_id", user.id);
    dbError = error; editId = null;
  } else {
    const { error } = await supabase.from("post_crud")
      .insert([{ title, description, image_url: imageUrl, first_name: firstName, last_name: lastName, user_id: user.id }]);
    dbError = error;
  }
  if (dbError) { alert("Error saving post: " + dbError.message); return; }

 window.topicQuill.setText("");
  window.commentQuill.setText("");
  selectedImage = "";
  document.querySelectorAll(".avatar-img").forEach(i => i.style.border = "1px solid #dee2e6");
showToast('success', 'Post saved 🎉', 'Your post is now live!');
  getPosts();
}

// ── Edit Post ────────────────────────────────────────────────
async function editPost(element, id) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) { alert("Login first!"); return; }
  const { data, error } = await supabase.from("post_crud").select("*")
    .eq("id", id).eq("user_id", user.id).single();
  if (error || !data) {
    showToast('error', 'Not allowed', 'You can only edit your own posts.');
    return;
  }
  window.topicQuill.clipboard.dangerouslyPasteHTML(data.title);
  window.commentQuill.clipboard.dangerouslyPasteHTML(data.description);
  editId = id;
  window.scrollTo({ top: 0, behavior: "smooth" });
          showToast('info', 'Edit mode', 'Update the fields above and click Save.', 2000);
}

// ── Delete Post ──────────────────────────────────────────────
async function deletePost(id, button) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) { alert("Please login first!"); return; }
  const confirm = await Swal.fire({
    title: "Delete this post?", icon: "warning",
    showCancelButton: true, confirmButtonText: "Yes, delete", cancelButtonText: "Cancel"
  });
  if (!confirm.isConfirmed) return;

  // Get post title before deleting (for log)
  const { data: postData } = await supabase.from("post_crud")
    .select("title").eq("id", id).single();

  const { data, error } = await supabase.from("post_crud")
    .delete().eq("id", id).eq("user_id", user.id).select();
  if (error) { console.log("Delete error:", error); return; }
  if (!data || data.length === 0) {
    Swal.fire({ icon: "error", title: "Not allowed", text: "You can only delete your own posts." }); return;
  }

  // Log the deletion
  await supabase.from("deleted_posts_log").insert({
    post_id: id,
    user_id: user.id,
    title: postData?.title || "Untitled"
  });

  button.closest(".card").remove();
}
// ── Skeleton Generator ──────────────────────────
function showSkeletons(count = 3) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
    <div class="skeleton-card" style="animation-delay:${i * 0.1}s">

      <!-- Header: avatar + name -->
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
        <div class="skeleton-line" style="width:50px; height:50px; border-radius:50%; flex-shrink:0;"></div>
        <div style="flex:1;">
          <div class="skeleton-line" style="width:40%; height:14px; margin-bottom:8px;"></div>
          <div class="skeleton-line" style="width:25%; height:11px;"></div>
        </div>
      </div>

      <!-- Title -->
      <div class="skeleton-line" style="width:75%; height:16px; margin-bottom:10px;"></div>

      <!-- Description lines -->
      <div class="skeleton-line" style="width:100%; height:12px; margin-bottom:7px;"></div>
      <div class="skeleton-line" style="width:88%;  height:12px; margin-bottom:7px;"></div>
      <div class="skeleton-line" style="width:60%;  height:12px; margin-bottom:16px;"></div>

      <!-- Image placeholder -->
      <div class="skeleton-line" style="width:100%; height:120px; border-radius:12px; margin-bottom:16px;"></div>

      <!-- Action bar -->
      <div style="display:flex; gap:10px; padding-top:10px; border-top:1px solid rgba(0,0,0,0.06);">
        <div class="skeleton-line" style="width:60px; height:28px; border-radius:20px;"></div>
        <div class="skeleton-line" style="width:90px; height:28px; border-radius:20px;"></div>
        <div style="margin-left:auto; display:flex; gap:8px;">
          <div class="skeleton-line" style="width:50px; height:28px; border-radius:6px;"></div>
          <div class="skeleton-line" style="width:60px; height:28px; border-radius:6px;"></div>
        </div>
      </div>
    </div>`;
  }
  return html;
}
// ── Get & Display Posts ──────────────────────────────────────
async function getPosts() {
  const postContainer = document.getElementById("postContainer");
  if (!postContainer) return;

  // Show skeletons
  postContainer.innerHTML = showSkeletons(3);

  const { data, error } = await supabase.from("post_crud").select("*").order("created_at", { ascending: false });
  if (error) { console.log(error); postContainer.innerHTML = ""; return; }

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id || null;
  const { data: allLikes } = await supabase.from("likes").select("post_id, user_id");
 const { data: allReactions } = currentUserId 
    ? await supabase.from("reactions").select("post_id, reaction_type").eq("user_id", currentUserId)
    : { data: [] };

  postContainer.innerHTML = "";
  data.forEach(post => displayPost(post, currentUserId, allLikes || [], allReactions || []));
}
// ── displayPost ──────────────────────────────────────────────
function displayPost(post, currentUserId = null, allLikes = [],allReactions = []) {
  const firstName  = post.first_name || "";
const lastName   = post.last_name  || "";
const displayName = firstName.trim() !== ""
  ? `${firstName} ${lastName}`.trim()
  : "User";
  const avatarUrl  = post.avatar_url || "";
  const userReaction = allReactions.find(r => r.post_id == post.id);
  const reactionEmoji = userReaction ? reactionEmojis[userReaction.reaction_type] : '❤️';

  const avatarContent = avatarUrl
    ? `<img src="${avatarUrl}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;">`
    : `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;

  const postLikes    = allLikes.filter(l => l.post_id == post.id);
  const likeCount    = postLikes.length;
  const userLiked    = currentUserId ? postLikes.some(l => l.user_id === currentUserId) : false;
  const likeClass    = userLiked ? "liked" : "";

  const html = `
    <div class="card shadow mb-4 p-0" id="post-card-${post.id}" style="background-image:url('${post.image_url}'); background-size:cover;">
      <div class="p-4" style="backdrop-filter: brightness(0.8);">
        <div class="d-flex align-items-center mb-3">
          <div class="rounded-circle bg-primary text-white d-flex justify-content-center align-items-center"
               style="width:50px;height:50px;font-size:20px;cursor:pointer;overflow:hidden;"
               onclick="document.getElementById('avatarInput-${post.id}').click()">
            ${avatarContent}
          </div>
          <input type="file" id="avatarInput-${post.id}" accept="image/*" style="display:none;"
                 onchange="uploadAvatar(this, '${post.id}', '${post.user_id}')">
          <div class="ms-3">
<h5 class="mb-0 text-white" style="cursor:pointer; transition:opacity 0.2s;"
    onmouseover="this.style.opacity='0.75'"
    onmouseout="this.style.opacity='1'"
    onclick="handleProfileClick('${post.user_id}')">
  ${displayName}
</h5>
          <small class="text-light">${new Date(post.created_at).toLocaleString()}</small>
          </div>
        </div>
        <div class="text-white fw-bold fs-5 mb-1">${post.title}</div>
        <p class="text-white mb-3">${post.description}</p>
        <div class="d-flex align-items-center gap-2 flex-wrap" style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px;">
     <button class="like-btn-custom ${likeClass}" 
        id="like-btn-${post.id}" 
        onclick="toggleLike(${post.id}, this)"
        onmouseover="showReactionPicker(${post.id})"
        onmouseout="hideReactionPicker(${post.id})">
  
  <!-- Dynamic Reaction -->
  <span class="reaction-display" id="reaction-display-${post.id}" style="font-size:24px;">${reactionEmoji}</span>
  
  <span id="like-count-${post.id}">${likeCount}</span>
</button>

<!-- Reaction Picker -->
<div id="reaction-picker-${post.id}" class="reaction-picker" 
     style="display:none;"
     onclick="showReactionPicker(${post.id})"
     onDoubleClick="hideReactionPicker(${post.id})">
</div>
          <button class="btn btn-sm" onclick="toggleComments(${post.id})"
                  style="background:rgba(9, 67, 155, 0.85); border:1px solid rgba(255,255,255,0.3); color:white; border-radius:20px; padding:4px 14px; font-size:13px;">
            💬 Comments
          </button>
          <div class="ms-auto d-flex gap-2">
            <button class="btn btn-warning btn-sm" onclick="editPost(this, ${post.id})">Edit</button>
            <button class="btn btn-danger btn-sm"  onclick="deletePost(${post.id}, this)">Delete</button>
            <button class="btn btn-sm" onclick="savePost('${post.id}')"
  style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.4);">
  🔖
</button>
          </div>
        </div>
        <div id="comments-section-${post.id}" style="display:none; margin-top:14px;">
          <div id="comments-list-${post.id}" style="max-height:220px; overflow-y:auto; margin-bottom:10px;"></div>
          <div class="d-flex gap-2" style="margin-top:8px;">
            <input type="text" id="comment-input-${post.id}"
                   placeholder="Write a comment..."
                   style="flex:1; background:rgba(20, 103, 226, 0.85); border:1px solid rgba(255,255,255,0.5);
                          color:white; border-radius:20px; padding:8px 16px; font-size:13px; outline:none;"
                   onkeydown="if(event.key==='Enter') submitComment(${post.id})">
            <button onclick="submitComment(${post.id})"
                    style="background:#0d6efd; border:none; color:white; border-radius:20px;
                           padding:8px 20px; font-size:13px; white-space:nowrap; cursor:pointer; font-weight:600;">
              Send ➤
            </button>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById("postContainer").innerHTML += html;
}

// ── Toggle Like ──────────────────────────────────────────────
async function toggleLike(postId, btn) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { Swal.fire({ icon: "warning", title: "Login karo pehle!" }); return; }

  const isLiked = btn.classList.contains("liked");

  // ✅ Fix: null check + sahi ID use karo
  const wrap = document.getElementById(`reaction-display-${postId}`);
  if (wrap) {
    wrap.style.animation = 'none';
    wrap.offsetHeight;
    wrap.style.animation = '';
  }

  if (isLiked) {
    await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id);
    btn.classList.remove("liked");
  } else {
    await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
    btn.classList.add("liked");
  }

  const { count } = await supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", postId);
  document.getElementById(`like-count-${postId}`).textContent = count ?? 0;

  if (!isLiked) {
    const { data: post } = await supabase.from("post_crud")
      .select("user_id, title").eq("id", postId).single();

    if (post && post.user_id !== user.id) {
      const fromName = `${sessionStorage.getItem("first_name") || ""} ${sessionStorage.getItem("last_name") || ""}`.trim() || "Someone";
      await supabase.from("notifications").insert({
        user_id: post.user_id,
        from_user_id: user.id,
        from_name: fromName,
        type: "like",
        post_id: postId,
        post_title: post.title,
        message: `${fromName} liked your post`
      });
    }
  }
}
/* ── Post Reactions (Facebook Style) ── */
/* ── Post Reactions (Improved Hover) ── */
/* ── Post Reactions (LinkedIn/Facebook Style) ── */
const reactionEmojis = {
  heart: '❤️',
  laugh: '😂',
  wow:   '😮',
  sad:   '😢',
  angry: '😡',
  like:  '👍'
};

// Track hide timers per post
const hideTimers = {};

window.showReactionPicker = function(postId) {
  // Cancel any pending hide
  if (hideTimers[postId]) {
    clearTimeout(hideTimers[postId]);
    hideTimers[postId] = null;
  }

  const picker = document.getElementById(`reaction-picker-${postId}`);
  if (!picker) return;

  let html = '';
  Object.keys(reactionEmojis).forEach(key => {
    html += `<span 
      class="reaction-option" 
      onclick="selectReaction(${postId}, '${key}', event)"
      title="${key}"
    >${reactionEmojis[key]}</span>`;
  });

  picker.innerHTML = html;
  picker.style.display = 'flex';
};

window.hideReactionPicker = function(postId) {
  // Delay hide so cursor can move from button → picker
  hideTimers[postId] = setTimeout(() => {
    const picker = document.getElementById(`reaction-picker-${postId}`);
    if (picker) picker.style.display = 'none';
  }, 400); // 400ms grace period
};

window.selectReaction = async function(postId, reactionType, e) {
  e.stopImmediatePropagation();

  // Immediately close picker
  const picker = document.getElementById(`reaction-picker-${postId}`);
  if (picker) picker.style.display = 'none';
  if (hideTimers[postId]) {
    clearTimeout(hideTimers[postId]);
    hideTimers[postId] = null;
  }

  // Update the reaction display on the button
  const reactionDisplay = document.getElementById(`reaction-display-${postId}`);
  if (reactionDisplay) {
    reactionDisplay.textContent = reactionEmojis[reactionType];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Remove previous reaction
  await supabase.from('reactions').delete()
    .eq('post_id', postId).eq('user_id', user.id);

  // Add new reaction
  await supabase.from('reactions').insert({
    post_id: postId,
    user_id: user.id,
    reaction_type: reactionType
  });

  showToast('success', reactionEmojis[reactionType] + ' Reaction added', '', 1200);
};
// Add hover listeners in displayPost
// ── Toggle Comments ──────────────────────────────────────────
async function toggleComments(postId) {
  const section = document.getElementById(`comments-section-${postId}`);
  const isHidden = section.style.display === "none";
  if (isHidden) { section.style.display = "block"; await loadComments(postId); }
  else { section.style.display = "none"; }
}

// ── Submit Comment ───────────────────────────────────────────
async function submitComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const commentText = input.value.trim();
  if (!commentText) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { Swal.fire({ icon: "warning", title: "You need to login first!" }); return; }

  const firstName = sessionStorage.getItem("first_name") || "User";
  const lastName  = sessionStorage.getItem("last_name")  || "";

  const { error } = await supabase.from("comments").insert({
    post_id: postId, user_id: user.id,
    first_name: firstName, last_name: lastName,
    comment: commentText
  });
 if (error) { Swal.fire({ icon: "error", title: "Comment failed", text: error.message }); return; }
  input.value = "";
  await loadComments(postId);

  // Notification — apni post pe comment karo to mat bhejo
  const { data: post } = await supabase.from("post_crud")
    .select("user_id, title").eq("id", postId).single();
  if (post && post.user_id !== user.id) {
    const fromName = `${firstName} ${lastName}`.trim() || "Someone";
    await supabase.from("notifications").insert({
      user_id: post.user_id,
      from_user_id: user.id,
      from_name: fromName,
      type: "comment",
      post_id: postId,
      post_title: post.title,
      message: `${fromName} commented on your post`
    });
  }
}

// ── Load Comments ────────────────────────────────────────────
async function loadComments(postId) {
  const list = document.getElementById(`comments-list-${postId}`);
  list.innerHTML = `<p style="color:rgba(255,255,255,0.6); font-size:13px;">Loading...</p>`;

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id || null;

  const { data, error } = await supabase.from("comments")
    .select("*").eq("post_id", postId).order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    list.innerHTML = `<p style="color:rgba(20, 20, 20, 0.5); font-size:13px; text-align:center;">No comments yet. Be first! 👆</p>`;
    return;
  }

  list.innerHTML = data.map(c => {
    const isOwner = currentUserId === c.user_id;
    const ownerActions = isOwner ? `
      <div style="display:flex; gap:6px; margin-top:5px;">
        <button onclick="editComment('${c.id}', ${postId})"
          style="background:rgba(255,193,7,0.25); border:1px solid rgba(255,193,7,0.4);
                 color:#000; border-radius:12px; padding:2px 10px; font-size:11px; cursor:pointer;"
          onmouseover="this.style.background='#eeb20ee7'"
          onmouseout="this.style.background='rgba(255,193,7,0.25)'">Edit</button>
        <button onclick="deleteComment('${c.id}', ${postId}, this)"
          style="background:rgba(220,53,69,0.25); border:1px solid rgba(220,53,69,0.4);
                 color:#ff6b7a; border-radius:12px; padding:2px 10px; font-size:11px; cursor:pointer;"
          onmouseover="this.style.background='#ee300ee7'; this.style.color='#fff'"
          onmouseout="this.style.background='rgba(220,53,69,0.25)'; this.style.color='#ff6b7a'">Delete</button>
      </div>` : "";

    return `
    <div id="comment-${c.id}" style="display:flex; align-items:flex-start; gap:8px; margin-bottom:10px;">
      <div style="width:34px;height:34px;border-radius:50%;background:rgba(13,110,253,0.6);border:2px solid rgba(255,255,255,0.4);
                  display:flex;align-items:center;justify-content:center;font-size:12px;color:white;flex-shrink:0;font-weight:600;">
        ${(c.first_name || "?").charAt(0).toUpperCase()}
      </div>
      <div style="background:rgba(255,255,255,0.22); border:1px solid rgba(255,255,255,0.2); border-radius:12px; padding:8px 14px; flex:1;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <div style="color:rgba(41,40,40,0.55); font-size:12px; font-weight:600;">${c.first_name} ${c.last_name}</div>
          <div style="color:rgba(41,40,40,0.55); font-size:11px;">${new Date(c.created_at).toLocaleString()}</div>
        </div>
        <div id="comment-text-${c.id}" style="color:black; font-size:13px;">${c.comment}</div>
        ${ownerActions}
      </div>
    </div>`;
  }).join("");
}

// ── Edit / Save / Cancel Comment ─────────────────────────────
async function editComment(commentId, postId) {
  const textDiv = document.getElementById(`comment-text-${commentId}`);
  const currentText = textDiv.dataset.original || textDiv.textContent.trim();
  if (textDiv.querySelector("input")) return;
  textDiv.dataset.original = currentText;
  textDiv.innerHTML = `
    <div style="display:flex; gap:6px; align-items:center;">
      <input id="edit-input-${commentId}"
        style="flex:1; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.4);
               color:white; border-radius:12px; padding:4px 10px; font-size:13px; outline:none;"
        onkeydown="if(event.key==='Enter') saveEditComment('${commentId}', ${postId})">
      <button onclick="saveEditComment('${commentId}', ${postId})"
        style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.35);
               color:white; border-radius:12px; padding:3px 12px; font-size:12px; cursor:pointer;">Save</button>
      <button onclick="cancelEditComment('${commentId}')"
        style="background:transparent; border:none; color:rgba(255,255,255,0.5); font-size:12px; cursor:pointer; padding:3px 6px;">Cancel</button>
    </div>`;
  const input = document.getElementById(`edit-input-${commentId}`);
  input.value = currentText; input.focus();
}

async function saveEditComment(commentId, postId) {
  const input = document.getElementById(`edit-input-${commentId}`);
  const newText = input.value.trim();
  if (!newText) return;
  const { error } = await supabase.from("comments").update({ comment: newText }).eq("id", commentId);
  if (error) { Swal.fire({ icon: "error", title: "Update failed", text: error.message }); return; }
  const textDiv = document.getElementById(`comment-text-${commentId}`);
  textDiv.dataset.original = newText;
  textDiv.textContent = newText;
}

function cancelEditComment(commentId) {
  const textDiv = document.getElementById(`comment-text-${commentId}`);
  textDiv.textContent = textDiv.dataset.original || "";
}

async function deleteComment(commentId, postId, btn) {
  const confirm = await Swal.fire({
    title: "Delete this comment?", icon: "warning",
    showCancelButton: true, confirmButtonText: "Yes, delete", cancelButtonText: "Cancel",
    background: "#1a1a2e", color: "white"
  });
  if (!confirm.isConfirmed) return;
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) { Swal.fire({ icon: "error", title: "Delete failed", text: error.message }); return; }
  document.getElementById(`comment-${commentId}`)?.remove();
  const list = document.getElementById(`comments-list-${postId}`);
  if (list && list.children.length === 0) {
    list.innerHTML = `<p style="color:rgba(255,255,255,0.5); font-size:13px; text-align:center;">No comments yet. Be first! 👆</p>`;
  }
}

// ── Upload Avatar ────────────────────────────────────────────
async function uploadAvatar(input, postId, postUserId) {
  const file = input.files[0];
  if (!file) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (user.id.trim() !== postUserId.trim()) {
    Swal.fire({ icon: "error", title: "Not allowed", text: "You can only update your own avatar!" }); return;
  }
  const fileName = `${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
  const { error: uploadError } = await supabase.storage.from("avatars")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });
  if (uploadError) { Swal.fire({ icon: "error", title: "Upload failed", text: uploadError.message }); return; }
  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
  const avatarUrl = urlData.publicUrl;
  await supabase.from("post_crud").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
  const circle = input.previousElementSibling;
  circle.innerHTML = `<img src="${avatarUrl}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;">`;
showToast('success', 'Avatar updated! 🎉', 'Your new photo is live.');}

// ── On Load ──────────────────────────────────────────────────
window.onload = function () {
  const postCardContainer = document.getElementById("postCardContainer");
  if (!postCardContainer) return;

  const isNewUser  = sessionStorage.getItem("isNewUser") === "true";
  const firstName  = sessionStorage.getItem("first_name") || "";

if (isNewUser || sessionStorage.getItem("showWelcome") === "true") {    // Hide content initially
    postCardContainer.style.display = "none";
    document.getElementById("postContainer").style.opacity = "0";

    // Show welcome
    if (typeof window.showWelcomeScreen === "function") {
      window.showWelcomeScreen(isNewUser, firstName);
    }

    // After welcome hides, show content
    setTimeout(() => {
      postCardContainer.style.display = "block";
      document.getElementById("postContainer").style.opacity = "1";
      document.getElementById("postContainer").style.transition = "opacity 0.5s ease";
      getPosts();
      updateNavAvatar();
    }, 3500);

sessionStorage.removeItem("isNewUser");
sessionStorage.removeItem("showWelcome");
  } else {
    postCardContainer.style.display = "block";
    updateNavAvatar();
    getPosts();
  }
};

// ── My Posts ─────────────────────────────────────────────────
async function myPosts() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data) { alert("Please login first"); return; }
    const { data: postData, error: postError } = await supabase.from("post_crud")
      .select("*").eq("user_id", data.user.id).order("id", { ascending: false });
    if (postError) { alert("Error fetching Posts"); return; }
    const { data: allLikes } = await supabase.from("likes").select("post_id, user_id");
    const posts = document.getElementById("postContainer");
    posts.innerHTML = "";
    postData.forEach(post => displayPost(post, data.user.id, allLikes || []));
  } catch (error) { console.error("Error in myPosts:", error); }
}

// ── Search ───────────────────────────────────────────────────
async function search() {
  const searchVal = document.getElementById("searchVal").value.trim();
  const postContainer = document.getElementById("postContainer");
  postContainer.innerHTML = "";
  if (!searchVal) { alert("Please enter a search term"); return; }
  try {
    const { data, error } = await supabase.from("post_crud").select("*")
      .or(`title.ilike.%${searchVal}%, description.ilike.%${searchVal}%`)
      .order("id", { ascending: false });
    if (!data || data.length === 0) {
      postContainer.innerHTML = `
        <div class="text-center mt-5">
          <img src="https://cdn.dribbble.com/userupload/24450589/file/original-7a69eb5b87401ce59325c3291535aebc.gif"
               alt="No posts found" width="250px" style="border-radius: 20px;"/>
          <div class="mt-3">No Posts Found!!!</div>
          <p class="text-muted">Try searching something else...</p>
        </div>`; return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { data: allLikes } = await supabase.from("likes").select("post_id, user_id");
    data.forEach(post => displayPost(post, user?.id || null, allLikes || []));
    if (error) console.error("Search error:", error);
  } catch (err) { console.error("Search error:", err); }
}

// ── Google Auth ──────────────────────────────────────────────
async function continueWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'Google',
    options: { redirectTo: window.location.origin + '/index.html' }
  });
  if (error) console.log(error);
}
// ── Profile Click Handler ────────────────────────
async function handleProfileClick(clickedUserId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (user.id === clickedUserId) {
    window.location.href = './profile.html';
  } else {
    showToast('info', 'Private Profile 🔒', 'You can only access your own profile.');
  }
}
window.handleProfileClick = handleProfileClick;
// ── Save Post ────────────────────────────────────
async function savePost(postId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { Swal.fire({ icon:'warning', title:'Login karo pehle!' }); return; }

  // Already saved check
  const { data: existing } = await supabase.from('saved_posts')
    .select('id').eq('post_id', postId).eq('user_id', user.id).single();

  if (existing) {
    showToast('info', 'Already saved! 🔖', 'Check your profile → Saved.');
    return;
  }

  const { error } = await supabase.from('saved_posts')
    .insert({ post_id: postId, user_id: user.id });

  if (error) { showToast('error', 'Save failed', error.message); return; }
  showToast('success', 'Post saved! 🔖', 'Find it in Profile → Saved.');
}
// ── Notifications ────────────────────────────────
async function loadNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: notifs } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  renderNotifications(notifs || []);
  updateNotifBadge(notifs || []);
}

function updateNotifBadge(notifs) {
  const unread = notifs.filter(n => !n.is_read).length;
  const badge  = document.getElementById("notifBadge");
  if (!badge) return;
  badge.textContent = unread;
  badge.style.display = unread > 0 ? "flex" : "none";
}

function renderNotifications(notifs) {
  const list = document.getElementById("notifList");
  if (!list) return;

  if (!notifs.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:32px 16px;color:#999;">
        <div style="font-size:36px;margin-bottom:10px;">🔔</div>
        <div style="font-size:14px;font-weight:600;">No notifications yet</div>
      </div>`;
    return;
  }

  list.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.is_read ? '' : 'unread'}" id="notif-${n.id}"
         onclick="markRead(${n.id})">
      <div class="notif-icon">${n.type === 'like' ? '❤️' : '💬'}</div>
      <div class="notif-body">
        <div class="notif-msg">${n.message}</div>
        <div class="notif-post">${stripHtml(n.post_title||'').slice(0,40)}</div>
        <div class="notif-time">${timeAgo(n.created_at)}</div>
      </div>
      ${!n.is_read ? '<div class="notif-dot"></div>' : ''}
    </div>`).join('');
}

async function markRead(notifId) {
  await supabase.from("notifications")
    .update({ is_read: true }).eq("id", notifId);
  const item = document.getElementById(`notif-${notifId}`);
  if (item) {
    item.classList.remove("unread");
    const dot = item.querySelector(".notif-dot");
    if (dot) dot.remove();
  }
  // Update badge
  const badge = document.getElementById("notifBadge");
  if (badge) {
    const current = parseInt(badge.textContent) - 1;
    badge.textContent = current;
    badge.style.display = current > 0 ? "flex" : "none";
  }
}

async function markAllRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications")
    .update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  loadNotifications();
  showToast('success', 'All marked as read ✅');
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return d.textContent || '';
}

// Realtime notifications
function initNotifRealtime(userId) {
  supabase.channel('notif-realtime')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      const n = payload.new;
      showToast('info',
        n.type === 'like' ? '❤️ New Like!' : '💬 New Comment!',
        n.message, 4000);
      loadNotifications();
    })
    .subscribe();
}
// ── Init Notifications only on index.html ──
if (window.location.pathname.includes("index.html") || window.location.pathname.includes("profile.html")) {
  const { data: { user: notifUser } } = await supabase.auth.getUser();
  if (notifUser) {
    if (window.location.pathname.includes("index.html")) {
      loadNotifications();
      initNotifRealtime(notifUser.id);
    }
  }
}
/* ── Navbar Profile Avatar Popup ── */
/* ── Navbar Profile Avatar + Popup ── */
/* ── Navbar Profile Avatar + Popup ── */
async function updateNavAvatar() {
  const btn = document.getElementById('navAvatarBtn');
  if (!btn) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get latest avatar (profiles + post_crud fallback)
  let avatarUrl = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  if (profile?.avatar_url) {
    avatarUrl = profile.avatar_url;
  } else {
    const { data: post } = await supabase
      .from("post_crud")
      .select("avatar_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    avatarUrl = post?.avatar_url || "";
  }

  const firstName = sessionStorage.getItem("first_name") || "";

  if (avatarUrl) {
    btn.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    const initial = firstName.charAt(0).toUpperCase() || "👤";
    btn.innerHTML = `<span style="font-size:18px;font-weight:700;color:white;">${initial}</span>`;
  }
}

// function toggleProfilePopup() {
//   const popup = document.getElementById('profilePopup');
//   if (!popup) {
//     console.error("Profile popup element not found!");
//     return;
//   }

//   const isOpen = popup.style.display === 'block';
//   popup.style.display = isOpen ? 'none' : 'block';

//   if (!isOpen) {
//     updatePopupUserInfoNav();
//   }
// }
function toggleProfilePopup() {
  const popup = document.getElementById('profilePopup');
  if (!popup) return;

  const isOpen = popup.style.display === 'block';
  popup.style.display = isOpen ? 'none' : 'block';

  if (!isOpen) {
    const isDark = document.body.classList.contains('dark-mode');
    popup.style.background  = isDark ? '#1a1a22' : 'white';
    popup.style.borderColor = isDark ? '#2a2a38' : '#e8e8e8';
    popup.style.boxShadow   = isDark
      ? '0 12px 40px rgba(0,0,0,0.45)'
      : '0 12px 40px rgba(0,0,0,0.18)';

    const btns = popup.querySelectorAll('.popup-btn');
    btns.forEach(btn => {
      if (btn.classList.contains('popup-btn-logout')) {
        btn.style.color = isDark ? '#ff6b6b' : '#d32f2f';
      } else {
        btn.style.color = isDark ? '#ffffff' : '#1a1a1a';
      }
    });

    updatePopupUserInfoNav();
  }
}

window.toggleNotifPanel = function() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;

  const isOpen = panel.style.display === 'block';
  panel.style.display = isOpen ? 'none' : 'block';

  if (!isOpen) {
    const isDark = document.body.classList.contains('dark-mode');
    panel.style.background  = isDark ? '#1a1a22' : 'white';
    panel.style.borderColor = isDark ? '#2a2a38' : '#e8e8e8';
    panel.style.boxShadow   = isDark
      ? '0 16px 48px rgba(0,0,0,0.45)'
      : '0 16px 48px rgba(0,0,0,0.15)';
    loadNotifications();
  }
}

// Close both panels on outside click
document.addEventListener('click', (e) => {
  const popup  = document.getElementById('profilePopup');
  const notif  = document.getElementById('notifPanel');
  const avatar = document.getElementById('navAvatarBtn');
  const bell   = document.getElementById('notifBtn');

  if (popup && avatar && !popup.contains(e.target) && !avatar.contains(e.target)) {
    popup.style.display = 'none';
  }
  if (notif && bell && !notif.contains(e.target) && !bell.contains(e.target)) {
    notif.style.display = 'none';
  }
});
async function updatePopupUserInfoNav() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  let avatarUrl = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (profile?.avatar_url) avatarUrl = profile.avatar_url;
  else {
    const { data: post } = await supabase
      .from("post_crud")
      .select("avatar_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    avatarUrl = post?.avatar_url || "";
  }

  const firstName = profile?.first_name || sessionStorage.getItem("first_name") || "User";
  const fullName = `${firstName} ${profile?.last_name || ''}`.trim();

  document.getElementById('popupNameNav').textContent = fullName;
  document.getElementById('popupEmailNav').textContent = user.email || "";

  const av = document.getElementById('popupAvatarNav');
  if (avatarUrl) {
    av.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;">`;
  } else {
    av.textContent = firstName.charAt(0).toUpperCase() || "👤";
  }
}

function goToProfile() {
  const popup = document.getElementById('profilePopup');
  if (popup) popup.style.display = 'none';
  window.location.href = './profile.html';
}

// Close popup when clicking outside
document.addEventListener('click', (e) => {
  const popup = document.getElementById('profilePopup');
  const btn = document.getElementById('navAvatarBtn');
  if (popup && btn && !popup.contains(e.target) && !btn.contains(e.target)) {
    popup.style.display = 'none';
  }
});

// Make functions globally available
window.toggleProfilePopup = toggleProfilePopup;
window.goToProfile = goToProfile;
window.updateNavAvatar = updateNavAvatar;
window.markRead    = markRead;
window.markAllRead = markAllRead;
// ── Globals ──────────────────────────────────────────────────
window.savePost = savePost;
window.display            = display;
window.logout             = logout;
window.submitInfo         = submitInfo;
window.selectAvatar       = selectAvatar;
window.createPost         = createPost;
window.deletePost         = deletePost;
window.login              = login;
window.editPost           = editPost;
window.myPosts            = myPosts;
window.search             = search;
window.continueWithGoogle = continueWithGoogle;
window.uploadAvatar       = uploadAvatar;
window.toggleLike         = toggleLike;
window.toggleComments     = toggleComments;
window.submitComment      = submitComment;
window.editComment        = editComment;
window.saveEditComment    = saveEditComment;
window.cancelEditComment  = cancelEditComment;
window.deleteComment      = deleteComment;