'use client';

import {useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import FamiliarBulletin from './components/FamiliarBulletin';

const supabase=createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

const DISHES=[
  '鱼香肉丝','宫保鸡丁','麻婆豆腐','红烧肉','糖醋里脊','回锅肉',
  '水煮鱼','酸菜鱼','小笼包','北京烤鸭','锅包肉','东坡肉',
  '夫妻肺片','蚂蚁上树','地三鲜','佛跳墙','辣子鸡','番茄炒蛋',
  '扬州炒饭','葱油拌面','肉夹馍','担担面','狮子头','梅菜扣肉'
];

function randomDish(){
  return DISHES[Math.floor(Math.random()*DISHES.length)];
}

export default function Home(){
  const [posts,setPosts]=useState([]);
  const [selected,setSelected]=useState(null);
  const [comments,setComments]=useState([]);
  const [compose,setCompose]=useState(false);
  const [title,setTitle]=useState('');
  const [content,setContent]=useState('');
  const [files,setFiles]=useState([]);
  const [reply,setReply]=useState('');
  const [busy,setBusy]=useState(false);
  const [dish,setDish]=useState('');
  const [anonymous,setAnonymous]=useState(false);
  const [location,setLocation]=useState('熟人');
  const [identityOpen,setIdentityOpen]=useState(false);

  const load=async()=>{
    const {data}=await supabase.from('posts').select('*').order('created_at',{ascending:false});
    setPosts(data||[]);
  };

  useEffect(()=>{
    load();

    let saved='';
    try{ saved=localStorage.getItem('familiar_dish')||''; }catch{}
    const chosen=saved||randomDish();
    setDish(chosen);
    try{ localStorage.setItem('familiar_dish',chosen); }catch{}

    fetch('/api/identity',{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        if(d?.location && d.location!=='未知地区') setLocation(d.location);
      })
      .catch(()=>{});
  },[]);

  const changeDish=()=>{
    let next=randomDish();
    if(DISHES.length>1){
      while(next===dish) next=randomDish();
    }
    setDish(next);
    try{localStorage.setItem('familiar_dish',next)}catch{}
  };

  const displayName=anonymous?'匿名':`来自${location}的${dish||'熟人'}`;

  const open=async p=>{
    setSelected(p);
    const {data}=await supabase.from('comments').select('*').eq('post_id',p.id).order('created_at');
    setComments(data||[]);
  };

  async function publish(){
    if(!title.trim()||!content.trim())return alert('标题和内容都写一下');
    setBusy(true);
    try{
      let urls=[];
      for(const f of files.slice(0,4)){
        const ext=(f.name.split('.').pop()||'jpg').toLowerCase();
        const path=`${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const {error}=await supabase.storage.from('post-images').upload(path,f,{contentType:f.type||undefined});
        if(error)throw error;
        const {data}=supabase.storage.from('post-images').getPublicUrl(path);
        urls.push(data.publicUrl);
      }

      // Keep the current database schema unchanged.
      // The chosen identity is stored at the beginning of the content.
      const taggedContent=`【${displayName}】\n${content.trim()}`;
      const {error}=await supabase.from('posts').insert({
        title:title.trim(),
        content:taggedContent,
        images:urls
      });
      if(error)throw error;

      setTitle('');
      setContent('');
      setFiles([]);
      setCompose(false);
      await load();
    }catch(e){
      alert('发布失败：'+e.message);
    }finally{
      setBusy(false);
    }
  }

  async function sendReply(){
    if(!reply.trim())return;
    const tagged=`【${displayName}】\n${reply.trim()}`;
    const {error}=await supabase.from('comments').insert({
      post_id:selected.id,
      content:tagged
    });
    if(error)return alert('回复失败：'+error.message);
    setReply('');
    open(selected);
  }

  const ago=s=>{
    const m=Math.floor((Date.now()-new Date(s))/60000);
    return m<1?'刚刚':m<60?`${m}分钟前`:m<1440?`${Math.floor(m/60)}小时前`:`${Math.floor(m/1440)}天前`;
  };

  const splitTagged=text=>{
    const match=(text||'').match(/^【(.+?)】\n([\s\S]*)$/);
    return match?{name:match[1],body:match[2]}:{name:'匿名',body:text||''};
  };

  const IdentityBar=()=>(
    <div style={{
      margin:'12px 0',padding:'12px 14px',border:'1px solid #e5e5e5',
      borderRadius:12,background:'#fafafa',fontSize:14
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
        <div>
          今天的我是：<b>{displayName}</b>
        </div>
        <button
          type="button"
          onClick={()=>setIdentityOpen(v=>!v)}
          style={{background:'white',color:'#111',border:'1px solid #ddd',padding:'7px 12px'}}
        >
          更换身份
        </button>
      </div>

      {identityOpen&&(
        <div style={{marginTop:12,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <button
            type="button"
            onClick={()=>setAnonymous(false)}
            style={{background:!anonymous?'#111':'white',color:!anonymous?'white':'#111',border:'1px solid #ddd',padding:'7px 12px'}}
          >
            使用菜名
          </button>
          <button
            type="button"
            onClick={()=>setAnonymous(true)}
            style={{background:anonymous?'#111':'white',color:anonymous?'white':'#111',border:'1px solid #ddd',padding:'7px 12px'}}
          >
            完全匿名
          </button>
          {!anonymous&&(
            <button
              type="button"
              onClick={changeDish}
              style={{background:'white',color:'#111',border:'1px solid #ddd',padding:'7px 12px'}}
            >
              换一个菜名
            </button>
          )}
        </div>
      )}
    </div>
  );

  if(selected){
    const postView=splitTagged(selected.content);
    return (
      <main className="shell">
        <header><b>匿名的熟人论坛</b></header>
        <IdentityBar/>
        <button className="back" onClick={()=>setSelected(null)}>← 返回帖子列表</button>

        <article className="detail">
          <h1>{selected.title}</h1>
          <small>{postView.name} · {ago(selected.created_at)}</small>
          <p style={{whiteSpace:'pre-wrap'}}>{postView.body}</p>
          {(selected.images||[]).map(x=><img className="big" key={x} src={x} alt="帖子图片"/>)}
        </article>

        <h3 className="replytitle">回复</h3>
        {comments.length
          ? comments.map((c,i)=>{
              const cv=splitTagged(c.content);
              return (
                <div className="comment" key={c.id}>
                  <small>{i+1}楼 · {cv.name}</small>
                  <div style={{whiteSpace:'pre-wrap'}}>{cv.body}</div>
                </div>
              );
            })
          : <div className="comment muted">还没人回复，你来坐一楼。</div>
        }

        <div className="reply">
          <input
            value={reply}
            onChange={e=>setReply(e.target.value)}
            placeholder={`${displayName}，回复一句...`}
          />
          <button onClick={sendReply}>回复</button>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <header>
        <div>
          <b>匿名的熟人论坛</b>
          <small>匿名 · 简单 · 略熟的大家</small>
        </div>
        <button onClick={()=>setCompose(true)}>发帖</button>
      </header>

      <IdentityBar/>
      <FamiliarBulletin/>

      <nav>最新</nav>
      <section>
        {posts.length
          ? posts.map(p=>{
              const pv=splitTagged(p.content);
              return (
                <article className="post" key={p.id} onClick={()=>open(p)}>
                  <h2>{p.title}</h2>
                  <p>{pv.body.length>90?pv.body.slice(0,90)+'…':pv.body}</p>
                  {p.images?.length>0&&(
                    <div className="thumbs">
                      {p.images.slice(0,3).map(x=><img key={x} src={x} alt="帖子图片"/>)}
                    </div>
                  )}
                  <small>{pv.name} · {ago(p.created_at)}</small>
                </article>
              );
            })
          : <div className="empty">还没有帖子。发第一帖吧。</div>
        }
      </section>

      <button className="fab" onClick={()=>setCompose(true)}>＋</button>

      {compose&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setCompose(false)}>
          <div className="sheet">
            <h2>发一个新帖子</h2>
            <small>将以「{displayName}」发布</small>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="标题"/>
            <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="想说什么就说什么..."/>
            <label className="upload">
              选择图片（最多4张）
              <input type="file" accept="image/*" multiple onChange={e=>setFiles([...e.target.files].slice(0,4))}/>
            </label>
            {files.length>0&&<small>已选择 {files.length} 张图片</small>}
            <div className="actions">
              <button className="light" onClick={()=>setCompose(false)}>取消</button>
              <button disabled={busy} onClick={publish}>{busy?'发布中...':'发布'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
