import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// --- あなた専用のFirebase設定 ---
const myFirebaseConfig = {
  apiKey: "AIzaSyB2bluYYd4ZGmoo6eUs8GFDli3wN-oFZw4",
  authDomain: "teaching-materials-703fa.firebaseapp.com",
  projectId: "teaching-materials-703fa",
  storageBucket: "teaching-materials-703fa.firebasestorage.app",
  messagingSenderId: "957398223207",
  appId: "1:957398223207:web:2238dde990a6a5c59307c2",
  measurementId: "G-W74QWJ6MCQ"
};

// Firebaseの初期化（クラウドデータベースへの接続設定）
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : myFirebaseConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'teaching-materials-app';

// --- 多言語辞書 (i18n) ---
const translations = {
  ja: {
    appTitle: "オンライン授業ボード",
    teacherMode: "先生モード",
    columnView: "カラム",
    tileView: "タイル",
    addTopic: "題材を追加",
    addContent: "コンテンツを追加",
    noContent: "コンテンツがありません",
    noComments: "コメントはまだありません",
    namePlaceholder: "あなたの名前 (省略可)",
    commentPlaceholder: "コメントを追加...",
    send: "送信",
    cancel: "キャンセル",
    add: "追加する",
    deleteMsg: "本当にこのコンテンツを削除しますか？",
    deleteColMsg: "この題材と中のコンテンツをすべて削除しますか？",
    promptTopic: "新しい題材（カラム）の名前を入力してください",
    modalTitle: "「{0}」に追加",
    typeLabel: "種類",
    titleLabel: "タイトル (任意)",
    titlePlaceholder: "例：第1回課題について",
    contentLabelText: "本文",
    contentLabelUrl: "URL",
    contentLabelFile: "ファイル名",
    textPlaceholder: "内容を入力してください...",
    invalidYoutube: "無効なYouTube URLです",
    typeText: "テキスト",
    typeImage: "画像 (URL)",
    typeYoutube: "YouTube (URL)",
    typePdf: "PDF (ダミーファイル名)",
    typeVideo: "動画 (ダミーファイル名)",
    typeAudio: "音声 (ダミーファイル名)",
    justNow: "たった今",
    minsAgo: "分前",
    hoursAgo: "時間前",
    daysAgo: "日前",
    openBtn: "開く",
    selectFile: "ファイルを選択",
    uploading: "アップロード中...",
    confirmYes: "はい",
    confirmNo: "いいえ",
    adminLoginTitle: "先生ログイン",
    passwordLabel: "パスワード",
    loginBtn: "ログイン",
    wrongPassword: "パスワードが違います。(ヒント: 1234)",
    enterPasswordMsg: "先生用のパスワードを入力してください。"
  },
  en: {
    appTitle: "Online Class Board",
    teacherMode: "Teacher Mode",
    columnView: "Column",
    tileView: "Tile",
    addTopic: "Add Topic",
    addContent: "Add Content",
    noContent: "No content yet",
    noComments: "No comments yet",
    namePlaceholder: "Your name (optional)",
    commentPlaceholder: "Add a comment...",
    send: "Send",
    cancel: "Cancel",
    add: "Add Item",
    deleteMsg: "Are you sure you want to delete this content?",
    deleteColMsg: "Are you sure you want to delete this topic and all its contents?",
    promptTopic: "Enter the name of the new topic:",
    modalTitle: "Add to '{0}'",
    typeLabel: "Type",
    titleLabel: "Title (Optional)",
    titlePlaceholder: "e.g. Assignment 1",
    contentLabelText: "Body Text",
    contentLabelUrl: "URL",
    contentLabelFile: "File Name",
    textPlaceholder: "Enter content here...",
    invalidYoutube: "Invalid YouTube URL",
    typeText: "Text",
    typeImage: "Image (URL)",
    typeYoutube: "YouTube (URL)",
    typePdf: "PDF (Dummy filename)",
    typeVideo: "Video (Dummy filename)",
    typeAudio: "Audio (Dummy filename)",
    justNow: "Just now",
    minsAgo: "m ago",
    hoursAgo: "h ago",
    daysAgo: "d ago",
    openBtn: "Open",
    selectFile: "Select File",
    uploading: "Uploading...",
    confirmYes: "Yes",
    confirmNo: "No",
    adminLoginTitle: "Teacher Login",
    passwordLabel: "Password",
    loginBtn: "Login",
    wrongPassword: "Incorrect password. (Hint: 1234)",
    enterPasswordMsg: "Please enter the teacher password."
  }
};

// --- 初期ダミーデータ ---
const initialData = [
  {
    id: 'col-1',
    title: '第1回：イントロダクション / Week 1: Intro',
    items: [
      {
        id: 'item-1',
        type: 'text',
        title: 'はじめに / Welcome',
        content: 'このボードでは授業の資料や課題を共有します。 / We will share materials and assignments here.',
        comments: []
      },
      {
        id: 'item-2',
        type: 'youtube',
        title: '参考動画：Webの仕組み',
        content: 'https://www.youtube.com/watch?v=jIgk8v74IZg',
        comments: [{ id: 'c1', author: '学生A / Student A', text: 'とてもわかりやすかったです！ / Very clear!', date: new Date().toISOString() }]
      }
    ]
  },
  {
    id: 'col-2',
    title: '第2回：配布資料 / Week 2: Materials',
    items: [
      {
        id: 'item-3',
        type: 'pdf',
        title: '第2回 講義スライド / Slide 2',
        content: 'lecture_02_slides.pdf',
        comments: []
      },
      {
        id: 'item-4',
        type: 'image',
        title: '板書画像 / Board Image',
        content: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        comments: []
      }
    ]
  }
];

// YouTube URLから動画IDを抽出する関数
const getYouTubeID = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// 相対時間を計算する関数 (多言語対応)
const timeAgo = (dateString, lang) => {
  const t = translations[lang];
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return t.justNow;
  if (diffInSeconds < 3600) return lang === 'ja' ? `${Math.floor(diffInSeconds / 60)}${t.minsAgo}` : `${Math.floor(diffInSeconds / 60)}${t.minsAgo}`;
  if (diffInSeconds < 86400) return lang === 'ja' ? `${Math.floor(diffInSeconds / 3600)}${t.hoursAgo}` : `${Math.floor(diffInSeconds / 3600)}${t.hoursAgo}`;
  return lang === 'ja' ? `${Math.floor(diffInSeconds / 86400)}${t.daysAgo}` : `${Math.floor(diffInSeconds / 86400)}${t.daysAgo}`;
};

// --- アイコンコンポーネント (SVG) ---
const Icons = {
  Text: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>,
  Image: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>,
  Video: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>,
  Youtube: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>,
  Pdf: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>,
  Audio: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>,
  LayoutColumn: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>,
  LayoutGrid: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>,
  Globe: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>,
  Lock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
};

// 管理者ログイン用モーダル
const AdminLoginModal = ({ isOpen, onClose, onLogin, lang }) => {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState(false);
  const t = translations[lang];

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // プロトタイプ用の一時的なパスワード（本番環境ではFirebaseの認証機能を使います）
    if (pwd === '1234') {
      onLogin();
      setPwd('');
      setError(false);
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Icons.Lock /> {t.adminLoginTitle}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <p className="text-sm text-gray-600">{t.enterPasswordMsg}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.passwordLabel}</label>
            <input 
              type="password" 
              autoFocus
              value={pwd} 
              onChange={(e) => { setPwd(e.target.value); setError(false); }}
              className={`w-full border rounded-lg p-2 focus:ring-2 outline-none ${error ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`}
            />
            {error && <p className="text-xs text-red-500 mt-1">{t.wrongPassword}</p>}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
              {t.cancel}
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
              {t.loginBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// コンテンツ追加用モーダル
const AddItemModal = ({ isOpen, onClose, onAdd, columnName, lang }) => {
  const [type, setType] = useState('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const t = translations[lang];

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let finalContent = content;

    // ファイルアップロード処理 (Firebase Cloud Storage)
    if (['image', 'pdf', 'video', 'audio'].includes(type) && file) {
      setIsUploading(true);
      try {
        // 保存先のパスを生成（アプリIDとタイムスタンプで重複を防ぐ）
        const fileRef = ref(storage, `padlet_uploads/${appId}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              // アップロード進捗の計算
              const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setProgress(p);
            },
            (error) => reject(error),
            async () => {
              // アップロード完了後、公開URLを取得
              finalContent = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      } catch (error) {
        console.error("Upload failed", error);
        setIsUploading(false);
        return; // エラー時は処理を中断
      }
    }

    onAdd({
      id: `item-${Date.now()}`,
      type,
      title,
      content: finalContent,
      comments: []
    });
    
    setTitle('');
    setContent('');
    setFile(null);
    setProgress(0);
    setIsUploading(false);
    setType('text');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">{t.modalTitle.replace('{0}', columnName)}</h3>
          <button onClick={onClose} disabled={isUploading} className="text-gray-400 hover:text-gray-600 font-bold text-xl disabled:opacity-50">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.typeLabel}</label>
            <select 
              value={type} 
              onChange={(e) => {
                setType(e.target.value);
                setFile(null);
                setContent('');
              }}
              disabled={isUploading}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
            >
              <option value="text">{t.typeText}</option>
              <option value="image">{t.typeImage}</option>
              <option value="youtube">{t.typeYoutube}</option>
              <option value="pdf">{t.typePdf}</option>
              <option value="video">{t.typeVideo}</option>
              <option value="audio">{t.typeAudio}</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.titleLabel}</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.titlePlaceholder}
              disabled={isUploading}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === 'text' ? t.contentLabelText : type === 'youtube' ? t.contentLabelUrl : t.selectFile}
            </label>
            {type === 'text' ? (
              <textarea 
                required
                value={content} 
                onChange={(e) => setContent(e.target.value)}
                placeholder={t.textPlaceholder}
                disabled={isUploading}
                className="w-full border border-gray-300 rounded-lg p-2 h-24 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              />
            ) : type === 'youtube' ? (
              <input 
                required
                type="text" 
                value={content} 
                onChange={(e) => setContent(e.target.value)}
                placeholder={'https://youtube.com/...'}
                disabled={isUploading}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              />
            ) : (
              <div className="flex flex-col gap-2">
                <input 
                  required
                  type="file" 
                  accept={type === 'image' ? 'image/*' : type === 'pdf' ? '.pdf' : type === 'video' ? 'video/*' : 'audio/*'}
                  onChange={(e) => setFile(e.target.files[0])}
                  disabled={isUploading}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {/* プログレスバー */}
                {isUploading && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    <p className="text-xs text-gray-500 mt-1 text-right">{Math.round(progress)}% {t.uploading}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} disabled={isUploading} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50">
              {t.cancel}
            </button>
            <button type="submit" disabled={isUploading || (['image', 'pdf', 'video', 'audio'].includes(type) && !file)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[80px]">
              {isUploading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : t.add}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ItemCard = ({ item, colId, isAdmin, onDelete, onAddComment, lang }) => {
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const t = translations[lang];

  // ローカルストレージから名前を復元（初回のみ）
  useEffect(() => {
    const savedName = localStorage.getItem('padlet_student_name');
    if (savedName) setAuthorName(savedName);
  }, []);

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    const finalAuthor = authorName.trim() || (lang === 'ja' ? '匿名' : 'Anonymous');
    // 名前を保存
    if (finalAuthor !== '匿名' && finalAuthor !== 'Anonymous') {
      localStorage.setItem('padlet_student_name', finalAuthor);
    }

    onAddComment(colId, item.id, {
      id: `c-${Date.now()}`,
      author: finalAuthor,
      text: commentText,
      date: new Date().toISOString()
    });
    setCommentText('');
  };

  // 種類に応じたアイコンを取得
  const TypeIcon = Icons[item.type.charAt(0).toUpperCase() + item.type.slice(1)] || Icons.Text;
  const displayType = t[`type${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`] || item.type;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow">
      
      {/* 管理者用ヘッダー */}
      {isAdmin && (
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{item.type}</span>
          
          {/* 安全なインライン削除確認 */}
          {isDeleting ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 font-bold">{t.deleteMsg.split('?')[0]}?</span>
              <button onClick={() => onDelete(colId, item.id)} className="bg-red-500 text-white text-xs px-2 py-0.5 rounded hover:bg-red-600">{t.confirmYes}</button>
              <button onClick={() => setIsDeleting(false)} className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded hover:bg-gray-300">{t.confirmNo}</button>
            </div>
          ) : (
            <button 
              onClick={() => setIsDeleting(true)}
              className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Icons.Trash />
            </button>
          )}
        </div>
      )}

      {/* コンテンツ本体 */}
      <div className="p-4">
        {item.title && (
          <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <span className="text-blue-500"><TypeIcon /></span>
            {item.title}
          </h4>
        )}
        
        <div className="mb-4">
          {item.type === 'text' && (
            <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{item.content}</p>
          )}
          
          {item.type === 'image' && (
            <img src={item.content} alt={item.title || 'Image'} className="w-full h-auto rounded-lg border border-gray-100 object-cover max-h-64" onError={(e) => {e.target.onerror = null; e.target.src="https://placehold.co/600x400/eeeeee/999999?text=Image+Not+Found"}} />
          )}
          
          {item.type === 'youtube' && (
            <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingTop: '56.25%' }}>
              {getYouTubeID(item.content) ? (
                <iframe 
                  className="absolute top-0 left-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${getYouTubeID(item.content)}`} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="absolute top-0 left-0 w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                  {t.invalidYoutube}
                </div>
              )}
            </div>
          )}

          {item.type === 'pdf' && (
            <div className="flex items-center gap-3 bg-red-50 text-red-700 p-3 rounded-lg border border-red-100">
              <Icons.Pdf />
              <span className="text-sm font-medium truncate flex-1">{item.title || 'PDF Document'}</span>
              <a href={item.content} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs bg-white px-2 py-1 rounded border border-red-200 hover:bg-red-100 transition whitespace-nowrap">{t.openBtn}</a>
            </div>
          )}

          {item.type === 'video' && (
            <div className="w-full bg-black rounded-lg overflow-hidden border border-gray-200">
              <video src={item.content} controls className="w-full h-auto max-h-64 object-contain" />
            </div>
          )}

          {item.type === 'audio' && (
            <div className="w-full bg-gray-50 rounded-lg p-2 border border-gray-200">
              <audio src={item.content} controls className="w-full h-10" />
            </div>
          )}
        </div>

        {/* コメントセクション */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {item.comments.length > 0 ? (
            <ul className="space-y-3 mb-4 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {item.comments.map(comment => (
                <li key={comment.id} className="text-sm">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <span className="font-bold text-gray-700 text-xs">{comment.author}</span>
                    <span className="text-[10px] text-gray-400">{timeAgo(comment.date, lang)}</span>
                  </div>
                  <p className="text-gray-600 bg-gray-50 p-2 rounded-lg rounded-tl-none inline-block w-full">{comment.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 mb-3 italic">{t.noComments}</p>
          )}

          {/* コメント入力フォーム */}
          <form onSubmit={handleCommentSubmit} className="flex flex-col gap-2">
            <input 
              type="text" 
              placeholder={t.namePlaceholder} 
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
            />
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder={t.commentPlaceholder} 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 text-sm px-3 py-1.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              />
              <button 
                type="submit" 
                disabled={!commentText.trim()}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
              >
                {t.send}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function PadletCloneApp() {
  const [columns, setColumns] = useState([]);
  const [rawColumns, setRawColumns] = useState([]);
  const [rawItems, setRawItems] = useState([]);
  const [rawComments, setRawComments] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [viewMode, setViewMode] = useState('column'); // 'column' or 'tile'
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeModalColId, setActiveModalColId] = useState(null); 
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [lang, setLang] = useState('ja'); // 'ja' or 'en'
  
  const t = translations[lang];

  // 1. Firebase Authの初期化（匿名ログインまたは連携ログイン）
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. クラウドデータベースの変更をリアルタイムで監視 (onSnapshot)
  useEffect(() => {
    if (!user) return;

    // 保存場所（コレクション）の指定
    const colsRef = collection(db, 'artifacts', appId, 'public', 'data', 'padlet_columns');
    const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'padlet_items');
    const commentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'padlet_comments');

    // データが変更されるたびに状態を自動更新
    const unsubCols = onSnapshot(colsRef, (snapshot) => {
      setRawColumns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error(error));

    const unsubItems = onSnapshot(itemsRef, (snapshot) => {
      setRawItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error(error));

    const unsubComments = onSnapshot(commentsRef, (snapshot) => {
      setRawComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoaded(true); // 全データの初回読み込み完了
    }, (error) => console.error(error));

    return () => {
      unsubCols();
      unsubItems();
      unsubComments();
    };
  }, [user]);

  // 3. バラバラのデータを「カラム > アイテム > コメント」の階層構造に結合
  useEffect(() => {
    const assembledColumns = rawColumns
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(col => ({
        ...col,
        items: rawItems
          .filter(item => item.colId === col.id)
          .sort((a, b) => a.createdAt - b.createdAt)
          .map(item => ({
            ...item,
            comments: rawComments
              .filter(comment => comment.itemId === item.id)
              .sort((a, b) => a.createdAt - b.createdAt)
          }))
      }));
    setColumns(assembledColumns);
  }, [rawColumns, rawItems, rawComments]);

  // 4. 初回起動時のテスト用ダミーデータ自動登録
  useEffect(() => {
    if (isLoaded && rawColumns.length === 0) {
        initialData.forEach(async (col, colIndex) => {
            const colRef = doc(db, 'artifacts', appId, 'public', 'data', 'padlet_columns', col.id);
            await setDoc(colRef, { title: col.title, createdAt: Date.now() + colIndex });
            
            col.items.forEach(async (item, itemIndex) => {
                const itemRef = doc(db, 'artifacts', appId, 'public', 'data', 'padlet_items', item.id);
                await setDoc(itemRef, { 
                    colId: col.id, 
                    type: item.type, 
                    title: item.title || '', 
                    content: item.content,
                    createdAt: Date.now() + itemIndex
                });

                item.comments.forEach(async (comment, cIndex) => {
                    const commentRef = doc(db, 'artifacts', appId, 'public', 'data', 'padlet_comments', comment.id);
                    await setDoc(commentRef, {
                        itemId: item.id,
                        author: comment.author,
                        text: comment.text,
                        date: comment.date,
                        createdAt: Date.now() + cIndex
                    });
                });
            });
        });
    }
  }, [isLoaded, rawColumns.length]);

  // --- 状態更新ロジック (クラウド保存版) ---
  const handleAddItem = async (newItem) => {
    if (!user) return;
    const itemRef = doc(db, 'artifacts', appId, 'public', 'data', 'padlet_items', newItem.id);
    await setDoc(itemRef, {
        colId: activeModalColId,
        type: newItem.type,
        title: newItem.title,
        content: newItem.content,
        createdAt: Date.now()
    });
  };

  const handleDeleteItem = async (colId, itemId) => {
    if (!user) return;
    
    // アイテム本体の削除
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'padlet_items', itemId));
    
    // 関連するコメントもすべて削除
    const commentsToDelete = rawComments.filter(c => c.itemId === itemId);
    commentsToDelete.forEach(async (c) => {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'padlet_comments', c.id));
    });
  };

  const handleAddComment = async (colId, itemId, newComment) => {
    if (!user) return;
    const commentRef = doc(db, 'artifacts', appId, 'public', 'data', 'padlet_comments', newComment.id);
    await setDoc(commentRef, {
        itemId: itemId,
        author: newComment.author,
        text: newComment.text,
        date: newComment.date,
        createdAt: Date.now()
    });
  };

  const handleAddColumn = async () => {
    const title = window.prompt(t.promptTopic);
    if (!title) return;
    if (!user) return;

    const colId = `col-${Date.now()}`;
    const colRef = doc(db, 'artifacts', appId, 'public', 'data', 'padlet_columns', colId);
    await setDoc(colRef, {
        title,
        createdAt: Date.now()
    });
  };

  const handleDeleteColumn = async (colId) => {
    if (!user) return;

    // カラムの削除
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'padlet_columns', colId));

    // 中に入っているアイテムとコメントをすべて削除
    const itemsToDelete = rawItems.filter(i => i.colId === colId);
    itemsToDelete.forEach(async (item) => {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'padlet_items', item.id));
        const commentsToDelete = rawComments.filter(c => c.itemId === item.id);
        commentsToDelete.forEach(async (c) => {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'padlet_comments', c.id));
        });
    });
  };

  const activeColName = activeModalColId ? columns.find(c => c.id === activeModalColId)?.title : '';

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-800">
      
      {/* --- ヘッダー領域 --- */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              P
            </div>
            <h1 className="text-xl font-bold text-gray-800 hidden sm:block">{t.appTitle}</h1>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            
            {/* 言語切り替え */}
            <div className="flex items-center gap-1 text-sm bg-gray-100 rounded-full p-1 border border-gray-200">
              <Icons.Globe />
              <button 
                onClick={() => setLang('ja')} 
                className={`px-2 py-0.5 rounded-full transition-colors ${lang === 'ja' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
              >
                JA
              </button>
              <button 
                onClick={() => setLang('en')} 
                className={`px-2 py-0.5 rounded-full transition-colors ${lang === 'en' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
              >
                EN
              </button>
            </div>

            {/* 管理者切り替えトグル */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={isAdmin} 
                  onChange={(e) => {
                    if (e.target.checked) {
                      setShowLoginModal(true); // チェックを入れたらパスワード入力を求める
                    } else {
                      setIsAdmin(false); // チェックを外すときは即座にオフ
                    }
                  }} 
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${isAdmin ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAdmin ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 select-none hidden sm:inline">
                {t.teacherMode}
              </span>
            </label>

            <div className="h-6 w-px bg-gray-300"></div>

            {/* レイアウト切り替え */}
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
              <button 
                onClick={() => setViewMode('column')}
                className={`p-1.5 rounded-md flex items-center gap-1 transition-all ${viewMode === 'column' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title={t.columnView}
              >
                <Icons.LayoutColumn />
                <span className="text-sm font-medium hidden md:inline pr-1">{t.columnView}</span>
              </button>
              <button 
                onClick={() => setViewMode('tile')}
                className={`p-1.5 rounded-md flex items-center gap-1 transition-all ${viewMode === 'tile' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title={t.tileView}
              >
                <Icons.LayoutGrid />
                <span className="text-sm font-medium hidden md:inline pr-1">{t.tileView}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- メインコンテンツ領域 --- */}
      <main className="p-4 sm:p-6 max-w-full">
        
        {}
        {viewMode === 'column' && (
          <div className="flex items-start gap-6 overflow-x-auto pb-8 h-[calc(100vh-6rem)] custom-scrollbar">
            {columns.map(col => (
              <div key={col.id} className="bg-slate-200/60 rounded-2xl p-4 w-80 flex-shrink-0 flex flex-col max-h-full">
                {/* カラムヘッダー */}
                <div className="flex justify-between items-center mb-4 px-1">
                  <h2 className="font-bold text-gray-700 text-lg line-clamp-2">{col.title}</h2>
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        // カスタム確認UIに置き換えているため、ここでは簡略化した動作にします
                        // 実際には各カラム単位でも削除確認UIを出すのがベストです
                        if(window.confirm(t.deleteColMsg)) handleDeleteColumn(col.id);
                      }} 
                      className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Delete Topic">
                      <Icons.Trash />
                    </button>
                  )}
                </div>

                {/* コンテンツリスト */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1 pb-2">
                  {col.items.map(item => (
                    <ItemCard 
                      key={item.id} 
                      item={item} 
                      colId={col.id} 
                      isAdmin={isAdmin} 
                      onDelete={handleDeleteItem} 
                      onAddComment={handleAddComment}
                      lang={lang}
                    />
                  ))}
                  
                  {isAdmin && (
                    <button 
                      onClick={() => setActiveModalColId(col.id)}
                      className="w-full py-3 mt-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl font-medium hover:border-gray-400 hover:text-gray-700 hover:bg-white/50 transition-all flex items-center justify-center gap-2"
                    >
                      <Icons.Plus /> {t.addContent}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* 新規カラム追加ボタン */}
            {isAdmin && (
              <div className="w-80 flex-shrink-0">
                <button 
                  onClick={handleAddColumn}
                  className="w-full py-5 bg-white/40 border-2 border-dashed border-gray-400 text-gray-600 rounded-2xl font-bold hover:bg-white/80 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Icons.Plus /> {t.addTopic}
                </button>
              </div>
            )}
          </div>
        )}

        {}
        {viewMode === 'tile' && (
          <div className="max-w-7xl mx-auto">
            {isAdmin && (
              <div className="mb-6 flex gap-4">
                <button 
                  onClick={handleAddColumn}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 shadow-sm flex items-center gap-2 transition"
                >
                  <Icons.Plus /> {t.addTopic}
                </button>
              </div>
            )}
            
            {/* 題材ごとにセクションを分ける */}
            <div className="space-y-12">
              {columns.map(col => (
                <section key={col.id}>
                  <div className="flex items-center gap-4 mb-4 border-b border-gray-200 pb-2">
                    <h2 className="text-2xl font-bold text-gray-800">{col.title}</h2>
                    {isAdmin && (
                      <>
                        <button onClick={() => setActiveModalColId(col.id)} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 font-medium transition">
                          + {t.addContent}
                        </button>
                        <button 
                          onClick={() => {
                            if(window.confirm(t.deleteColMsg)) handleDeleteColumn(col.id);
                          }} 
                          className="text-sm text-gray-400 hover:text-red-500 transition ml-auto"
                        >
                          <Icons.Trash />
                        </button>
                      </>
                    )}
                  </div>
                  
                  {col.items.length === 0 ? (
                    <p className="text-gray-400 italic">{t.noContent}</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                      {col.items.map(item => (
                        <div key={item.id} className="w-full">
                          <ItemCard 
                            item={item} 
                            colId={col.id} 
                            isAdmin={isAdmin} 
                            onDelete={handleDeleteItem} 
                            onAddComment={handleAddComment}
                            lang={lang}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>
        )}
      </main>

      {}
      {/* 追加モーダル */}
      <AddItemModal 
        isOpen={!!activeModalColId} 
        onClose={() => setActiveModalColId(null)}
        onAdd={handleAddItem}
        columnName={activeColName}
        lang={lang}
      />

      {/* 先生ログインモーダル */}
      <AdminLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => setIsAdmin(true)}
        lang={lang}
      />

      {/* カスタムスクロールバー用のグローバルスタイル */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(107, 114, 128, 0.8);
        }
      `}} />
    </div>
  );
}