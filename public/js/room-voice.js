/**
 * POTATO audio rooms: peer-to-peer WebRTC mesh (max 6 in Debate, max 12 in Circle).
 * The server relays only ephemeral SDP/ICE metadata. Audio is NOT recorded or sent to the AI.
 * STUN-only prototype: restrictive NATs may require a TURN relay for production.
 */
export class RoomVoice {
  constructor(request, onUpdate = () => {}) {
    this.request = request;
    this.onUpdate = onUpdate;
    this.code = '';
    this.myId = '';
    this.stream = null;
    this.peers = new Map();
    this.muted = false;
    this.turnLocked = false;
    this.lastSeq = 0;
    this.poller = null;
    this.pollBusy = false;
    this.error = '';
    this.mounted = false;
  }
  get supported() { return !!(navigator.mediaDevices?.getUserMedia && window.RTCPeerConnection); }
  get active() { return !!(this.stream && this.stream.getTracks().some(t => t.readyState === 'live')); }
  get connected() { return [...this.peers.values()].filter(p => p.pc.connectionState === 'connected').length; }
  get status() { return {active:this.active,muted:this.muted,locked:this.turnLocked,connected:this.connected,error:this.error,supported:this.supported}; }
  async requestPermission() {
    if (!this.supported) { this.error='Thiết bị hoặc trình duyệt chưa hỗ trợ phòng thoại.'; this.onUpdate(); return false; }
    if (this.active) return true;
    try {
      this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
      this.muted=false;
      this.error='';
      this.onUpdate();
      return true;
    } catch(err) {
      this.error=err?.name==='NotAllowedError'?'Chưa được cấp quyền micro. Bạn vẫn có thể tham gia bằng văn bản.':'Không mở được micro. Kiểm tra quyền thiết bị.';
      this.onUpdate();return false;
    }
  }
  async enter(room) {
    if (!room) return;
    if (this.code && this.code!==room.code) this.stop();
    this.code=room.code;this.myId=room.viewerId;
    if (!this.active) {this.onUpdate();return;}
    this.attachRoot();
    if (!this.poller) this.poller=setInterval(()=>this.poll().catch(()=>{}),900);
    await this.poll();
    await this.sync(room);
    this.onUpdate();
  }
  attachRoot() {
    if (!document.getElementById('room-remote-audios')) {
      const root=document.createElement('div');root.id='room-remote-audios';root.hidden=true;document.body.appendChild(root);
    }
  }
  async send(to,type,payload=null) {
    if(!this.code) return;
    try{await this.request(`/api/rooms/${this.code}/signal`,{to,type,payload});}catch(err){this.error='Đường truyền âm thanh chập chờn: '+err.message;this.onUpdate();}
  }
  createPeer(id) {
    if(this.peers.has(id))return this.peers.get(id);
    const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});
    const peer={pc,pending:[],sentOffer:false};this.peers.set(id,peer);
    if(this.stream)for(const track of this.stream.getAudioTracks())pc.addTrack(track,this.stream);
    pc.onicecandidate=ev=>{if(ev.candidate)this.send(id,'candidate',ev.candidate.toJSON());};
    pc.ontrack=ev=>{
      this.attachRoot();let audio=document.getElementById(`potato-audio-${id}`);
      if(!audio){audio=document.createElement('audio');audio.id=`potato-audio-${id}`;audio.autoplay=true;audio.playsInline=true;audio.setAttribute('aria-label','Âm thanh từ thành viên');document.getElementById('room-remote-audios').appendChild(audio);}
      audio.srcObject=ev.streams[0]||new MediaStream([ev.track]);
      audio.play().catch(()=>{this.error='Nhấn “Phát âm thanh” nếu trình duyệt chặn tự phát.';this.onUpdate();});
    };
    pc.onconnectionstatechange=()=>{
      if(pc.connectionState==='failed'){this.error='Một kết nối thoại bị gián đoạn. Có thể cần máy chủ TURN.';}
      this.onUpdate();
    };
    return peer;
  }
  async sync(room) {
    if (!this.active || room.code!==this.code || room.stage==='ended') return;
    // Debate is a turn-taking format: everyone is silent during prep,
    // and only the current speaker broadcasts during each debate turn.
    this.turnLocked=room.mode==='debate'&&(room.stage==='prep'||(room.stage==='discussion'&&room.activeSpeakerId!==this.myId));
    for(const track of this.stream.getAudioTracks())track.enabled=!(this.muted||this.turnLocked);
    const others=new Set(room.members.filter(m=>m.id!==this.myId&&!m.isBot).map(m=>m.id));
    for(const id of [...this.peers.keys()])if(!others.has(id))this.closePeer(id);
    for(const id of others) {
      const peer=this.createPeer(id);
      // Deterministic offerer; only one side offers, preventing glare.
      if(this.myId<id && !peer.sentOffer) {
        peer.sentOffer=true;
        try {
          const offer=await peer.pc.createOffer();await peer.pc.setLocalDescription(offer);
          await this.send(id,'offer',peer.pc.localDescription.toJSON());
        } catch(err){this.error='Không thể tạo kết nối thoại: '+err.message;this.onUpdate();}
      }
    }
    this.onUpdate();
  }
  async receive(signal) {
    if(!this.active||!signal?.from||signal.from===this.myId)return;
    const {from,type,payload}=signal;
    if(type==='bye'){this.closePeer(from);return;}
    const peer=this.createPeer(from),pc=peer.pc;
    try{
      if(type==='offer'){
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        await this.flushCandidates(peer);
        const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
        await this.send(from,'answer',pc.localDescription.toJSON());
      }else if(type==='answer'){
        if(pc.signalingState==='have-local-offer'){
          await pc.setRemoteDescription(new RTCSessionDescription(payload));await this.flushCandidates(peer);
        }
      }else if(type==='candidate'){
        if(pc.remoteDescription)await pc.addIceCandidate(new RTCIceCandidate(payload));
        else peer.pending.push(payload);
      }
    }catch(err){this.error='Không ghép được âm thanh với một thành viên: '+err.message;this.onUpdate();}
  }
  async flushCandidates(peer){
    for(const c of peer.pending.splice(0))await peer.pc.addIceCandidate(new RTCIceCandidate(c));
  }
  async poll() {
    if(!this.code||!this.active||this.pollBusy)return;
    this.pollBusy=true;
    const code=this.code;
    try{
      const data=await this.request(`/api/rooms/${code}/signals?after=${this.lastSeq}`);
      if(this.code!==code)return;
      for(const sig of data.signals||[]){this.lastSeq=Math.max(this.lastSeq,sig.seq);await this.receive(sig);}
      this.lastSeq=Math.max(this.lastSeq,data.latest||0);
    }catch(err){this.error='Tạm mất kết nối tín hiệu. Đang thử lại.';this.onUpdate();}
    finally{this.pollBusy=false;}
  }
  toggleMute(){if(!this.active||this.turnLocked)return;this.muted=!this.muted;for(const t of this.stream.getAudioTracks())t.enabled=!(this.muted||this.turnLocked);this.onUpdate();}
  unlockPlayback(){document.querySelectorAll('#room-remote-audios audio').forEach(a=>a.play().catch(()=>{}));this.error='';this.onUpdate();}
  closePeer(id){const peer=this.peers.get(id);if(peer){peer.pc.close();this.peers.delete(id);}document.getElementById(`potato-audio-${id}`)?.remove();this.onUpdate();}
  stop(){
    if(this.poller)clearInterval(this.poller);this.poller=null;
    for(const id of [...this.peers.keys()])this.closePeer(id);
    for(const t of this.stream?.getTracks()||[])t.stop();this.stream=null;
    this.code='';this.myId='';this.lastSeq=0;this.muted=false;this.turnLocked=false;this.pollBusy=false;this.error='';
    document.getElementById('room-remote-audios')?.remove();
    this.onUpdate();
  }
}
