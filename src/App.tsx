import { useEffect, useRef, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'

import wowDeathKnight from '@/assets/deathknight.png'
import wowDemonHunter from '@/assets/demon_hunter.png'
import wowDruid from '@/assets/druid.png'
import wowEvoker from '@/assets/evoker.png'
import wowHunter from '@/assets/hunter.png'
import wowMage from '@/assets/mage.png'
import wowMonk from '@/assets/monk.png'
import wowPaladin from '@/assets/paladin.png'
import wowPriest from '@/assets/priest.png'
import wowRogue from '@/assets/rogue.png'
import wowShaman from '@/assets/shaman.png'
import wowWarlock from '@/assets/warlock.png'
import wowWarrior from '@/assets/warrior.png'

// --- Interface Definitions ---
interface ChzzkMessageBody { profile: string; extras: string; msg: string; msgTime: number }
interface ChzzkProfile { userRoleCode: string; nickname: string }
interface ChzzkData { cmd: number; bdy?: ChzzkMessageBody[] }

// ▼▼▼ [수정됨] 역할 타입을 명확하게 정의 ▼▼▼
type Role = '탱커' | '딜러' | '힐러';
// ▲▲▲ 추가 ▲▲▲

interface Member {
  class: string;
  nick: string;
  role: Role; // <-- string 대신 Role 타입 사용
  job: string;
  selected: boolean;
}
interface WoWClasses { class: string; image: string; color: string; jobs: WoWJobs[] }
interface WoWJobs { specificity: string; role: Role } // <-- string 대신 Role 타입 사용 (데이터 일관성)
interface MatchedWoWData { class: string; image: string; color: string; specificity: string; role: Role } // <-- string 대신 Role 타입 사용

function App() {
  const [members, setMembers] = useState<Member[]>([])
  const [isShow, setIsShow] = useState<boolean>(false)
  const [isRolling, setIsRolling] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [roleFilter, setRoleFilter] = useState({ tank: true, healer: true, dealer: true });

  const socketRef = useRef<WebSocket | null>(null)
  const isManualCloseRef = useRef(false)

  // --- WoW Class Data ---
  // (WoW 데이터는 이전과 동일, 각 job의 role이 '탱커', '딜러', '힐러' 문자열 리터럴이므로 Role 타입과 호환됨)
  const wowClasses: WoWClasses[] = [
    { class: '전사', image: wowWarrior, color: '#C79C6E', jobs: [ { specificity: '무기', role: '딜러' }, { specificity: '분노', role: '딜러' }, { specificity: '방어', role: '탱커' } ] },
    { class: '성기사', image: wowPaladin, color: '#F58CBA', jobs: [ { specificity: '보호', role: '탱커' }, { specificity: '징벌', role: '딜러' }, { specificity: '신기', role: '힐러' } ] },
    { class: '죽음의기사', image: wowDeathKnight, color: '#C41F3B', jobs: [ { specificity: '혈기', role: '탱커' }, { specificity: '냉죽', role: '딜러' }, { specificity: '부정', role: '딜러' } ] },
    { class: '주술사', image: wowShaman, color: '#0070DE', jobs: [ { specificity: '정기', role: '딜러' }, { specificity: '고양', role: '딜러' }, { specificity: '복원', role: '힐러' } ] },
    { class: '사냥꾼', image: wowHunter, color: '#ABD473', jobs: [ { specificity: '야수', role: '딜러' }, { specificity: '사격', role: '딜러' }, { specificity: '생존', role: '딜러' } ] },
    { class: '도적', image: wowRogue, color: '#FFF569', jobs: [ { specificity: '암살', role: '딜러' }, { specificity: '무법', role: '딜러' }, { specificity: '잠행', role: '딜러' } ] },
    { class: '기원사', image: wowEvoker, color: '#33937F', jobs: [ { specificity: '황폐', role: '딜러' }, { specificity: '보존', role: '힐러' }, { specificity: '증강', role: '딜러' } ] },
    { class: '악마사냥꾼', image: wowDemonHunter, color: '#A330C9', jobs: [ { specificity: '복수', role: '탱커' }, { specificity: '파멸', role: '딜러' } ] },
    { class: '수도사', image: wowMonk, color: '#00FF96', jobs: [ { specificity: '양조', role: '탱커' }, { specificity: '풍운', role: '딜러' }, { specificity: '운무', role: '힐러' } ] },
    { class: '마법사', image: wowMage, color: '#69CCF0', jobs: [ { specificity: '냉법', role: '딜러' }, { specificity: '화염', role: '딜러' }, { specificity: '비전', role: '딜러' } ] },
    { class: '흑마법사', image: wowWarlock, color: '#9482C9', jobs: [ { specificity: '악마', role: '딜러' }, { specificity: '파괴', role: '딜러' }, { specificity: '고통', role: '딜러' } ] },
    { class: '사제', image: wowPriest, color: '#FFFFFF', jobs: [ { specificity: '수양', role: '힐러' }, { specificity: '신사', role: '힐러' }, { specificity: '암흑', role: '딜러' } ] },
    { class: '드루이드', image: wowDruid, color: '#FF7D0A', jobs: [ { specificity: '조화', role: '딜러' }, { specificity: '야성', role: '딜러' }, { specificity: '수호', role: '탱커' }, { specificity: '회복', role: '힐러' } ] }
  ];

  // --- Helper Function ---
  const findWoWClassBySpecificity = (msg: string): MatchedWoWData | null => {
    const searchTerm = msg.toLowerCase();
    for (const classData of wowClasses) {
      const matchedJob = classData.jobs.find(job => job.specificity === searchTerm);
      if (matchedJob) return {
          class: classData.class, image: classData.image, color: classData.color,
          specificity: matchedJob.specificity, role: matchedJob.role
      };
    }
    return null;
  };


  // --- WebSocket Message Handler ---
  const checkMessage = (role: string, nick: string, msg: string) => {
    if (role === 'streamer' && msg === '파티') setIsShow(true);
    if (msg === '취소') {
      setMembers((prev) => prev.filter((m) => !(m.nick === nick && !m.selected)));
      return;
    }
    const matchedData = findWoWClassBySpecificity(msg);
    if (matchedData) {
      setMembers((prev) => {
        const existingIndex = prev.findIndex(member => member.nick === nick);
        if (existingIndex === -1) {
          return [...prev, { nick, class: matchedData.class, role: matchedData.role, job: matchedData.specificity, selected: false }];
        }
        if (!prev[existingIndex].selected) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], class: matchedData.class, role: matchedData.role, job: matchedData.specificity };
          return updated;
        }
        return prev;
      });
    }
  };

  // --- WebSocket Connection ---
  const connectWebSocket = () => {
    const ssID = Math.floor(Math.random() * 10) + 1;
    const serverUrl = `wss://kr-ss${ssID}.chat.naver.com/chat`;
    const socket = new WebSocket(serverUrl);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      const params = new URLSearchParams(window.location.search);
      const chatChannelID = params.get('chzzk');
      if (!chatChannelID) {
          console.error("chzzk 채널 ID가 URL 파라미터에 없습니다.");
          toast.error("chzzk 채널 ID가 URL에 없습니다!");
          return;
      }
      socket.send(JSON.stringify({ ver: '2', cmd: 100, svcid: 'game', cid: chatChannelID, bdy: { devType: 2001, auth: 'READ' }, tid: 1 }));
    });

    socket.addEventListener('message', (event) => {
      try {
          const data: ChzzkData = JSON.parse(event.data);
          if (data.bdy && Array.isArray(data.bdy)) {
              data.bdy.forEach(body => {
                  try {
                      if (typeof body.profile === 'string') {
                          const profile: ChzzkProfile = JSON.parse(body.profile);
                          checkMessage(profile.userRoleCode, profile.nickname, body.msg);
                      } else { console.warn("Received message body with non-string profile:", body); }
                  } catch (e) { console.error("Error parsing profile JSON:", body.profile, e); }
              });
          }
          if (data.cmd === 0) socket.send(JSON.stringify({ ver: '2', cmd: 10000 }));
      } catch (e) { console.error("Error parsing WebSocket message:", event.data, e); }
    });

    socket.addEventListener('close', (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (!isManualCloseRef.current) {
            console.log('Attempting to reconnect WebSocket...');
            setTimeout(connectWebSocket, 5000);
        }
    });
    socket.addEventListener('error', (error) => {
        console.error('WebSocket Error:', error);
        toast.error('채팅 서버 연결 오류 발생!');
        // socketRef.current?.close(); // Ensure closure before reconnect attempt
        // if (!isManualCloseRef.current) { setTimeout(connectWebSocket, 5000); }
    });
  };


  // --- Rollup Animation ---
  const rollupAnimation = (targetMembers: Member[]) => {
    if (!Array.isArray(targetMembers) || targetMembers.length === 0) {
        toast.warn('선택 가능한 멤버가 없습니다');
        setIsRolling(false);
        return;
    }
    setIsRolling(true);
    let counter = 0;
    const interval = setInterval(() => {
        if (targetMembers.length === 0) {
             clearInterval(interval); setIsRolling(false);
             toast.error("룰렛 오류: 대상 멤버 없음"); return;
        }
        const randomIndex = Math.floor(Math.random() * targetMembers.length);
        if (targetMembers[randomIndex]) {
            setSelectedMember(targetMembers[randomIndex]);
        } else {
            console.error("Animation Error: Index out of bounds?", randomIndex, targetMembers);
             clearInterval(interval); setIsRolling(false);
             toast.error("룰렛 멤버 선택 오류"); return;
        }
        counter++;

        if (counter > 20) {
            clearInterval(interval);
            if (targetMembers.length === 0) {
                 setIsRolling(false); toast.error("최종 선택 오류: 대상 멤버 없음"); return;
            }
            const finalIndex = Math.floor(Math.random() * targetMembers.length);
             if (targetMembers[finalIndex]) {
                const selected = targetMembers[finalIndex];
                setSelectedMember(selected);

                setTimeout(() => {
                  setMembers((prev) => {
                    let updatedMembers = prev.map((m) =>
                      m.nick === selected.nick ? { ...m, selected: true } : m
                    );
                    if (selected.role === '탱커') {
                      updatedMembers = updatedMembers.filter(m => m.selected || m.role !== '탱커');
                    } else if (selected.role === '힐러') {
                      updatedMembers = updatedMembers.filter(m => m.selected || m.role !== '힐러');
                    }
                    return updatedMembers;
                  });
                  setIsRolling(false);
                  setSelectedMember(null);
                }, 1000);
            } else {
                 console.error("Final Selection Error: Index out of bounds?", finalIndex, targetMembers);
                 setIsRolling(false); toast.error("최종 멤버 선택 오류");
            }
        }
    }, 100);
  };


  // --- Random Selection Handler ---
  const handleRandomAll = () => {
    const selectedParty = members.filter(m => m.selected);
    const hasTank = selectedParty.some(m => m.role === '탱커');
    const hasHealer = selectedParty.some(m => m.role === '힐러');
    const available = members.filter(m => !m.selected);

    const targetMembers = available.filter(m => {
      if (hasTank && m.role === '탱커') return false;
      if (hasHealer && m.role === '힐러') return false;
      if (roleFilter.tank && m.role === '탱커') return true;
      if (roleFilter.healer && m.role === '힐러') return true;
      if (roleFilter.dealer && m.role === '딜러') return true;
      return false;
    });

    if (!Array.isArray(targetMembers)) {
        console.error("Error: targetMembers is not an array after filtering", targetMembers);
        toast.error("멤버 필터링 오류"); return;
    }

    if (targetMembers.length === 0) {
      const availableFilteredByCheckboxOnly = available.filter(m =>
        (roleFilter.tank && m.role === '탱커') ||
        (roleFilter.healer && m.role === '힐러') ||
        (roleFilter.dealer && m.role === '딜러')
      );
      if (availableFilteredByCheckboxOnly.length === 0) {
        toast.warn('선택한 역할의 대기 멤버가 없습니다!');
      } else {
        toast.warn('현재 파티 구성에 맞는 역할의 대기 멤버가 없습니다!');
      }
      return;
    }
    rollupAnimation(targetMembers);
  };


  // --- WebSocket Effect ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('chzzk')) {
        connectWebSocket();
    } else {
        toast.info("URL에 ?chzzk=채널ID 를 추가해주세요.");
    }

    const handleBeforeUnload = () => { isManualCloseRef.current = true; socketRef.current?.close(); };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isManualCloseRef.current = true;
      socketRef.current?.close();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Run only once

  // --- JSX Rendering ---
  return (
    <>
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="dark" />
      {isShow && (
        <div className="w-[950px] h-[800px] bg-black bg-opacity-80 border border-gray-600 flex flex-row rounded-2xl overflow-hidden shadow-2xl">
          {/* Rolling Animation Overlay */}
          {isRolling && selectedMember && (
            <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-2xl shadow-2xl animate-bounce">
                <div className="text-4xl font-bold text-center mb-4">🎀</div>
                <div className="text-2xl text-lime-400 font-bold mb-2">{selectedMember.nick}</div>
                <div className="text-lg text-gray-600">{selectedMember.job}</div>
                <div className="text-lg text-gray-600">{selectedMember.role}</div>
              </div>
            </div>
          )}

          {/* Left Area (Waiting + Selected) */}
          <div className="flex flex-col flex-grow border-r border-gray-700">
            {/* Top: Waiting Members */}
            <div className="h-1/2 overflow-y-auto p-3 bg-gray-900 bg-opacity-50 border-b border-gray-700">
              <div className="grid grid-cols-5 gap-1.5">
                {[...members].reverse().filter(member => !member.selected).map((member, index) => {
                  const classImage = wowClasses.find(c => c.class === member.class)?.image;
                  return (
                    <div key={`${member.nick}-${index}`} className="group h-12 w-full [perspective:1000px]">
                      <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                        {/* Front Card */}
                        <div
                          className="absolute inset-0 border border-gray-600 p-1.5 rounded bg-gray-800 bg-opacity-80 [backface-visibility:hidden] flex items-center justify-end"
                          style={{
                            backgroundImage: classImage ? `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${classImage})` : 'none',
                            backgroundSize: '24px 24px', backgroundPosition: '4px center', backgroundRepeat: 'no-repeat'
                          }}>
                          <div className="text-right ml-8 overflow-hidden whitespace-nowrap">
                            <span className="text-[10px] text-gray-300">{member.role}</span>
                            <span className="text-[10px] text-gray-300 mx-0.5">|</span>
                            <span className="text-[10px] text-gray-400 truncate">{member.job}</span>
                            <div className="font-semibold text-[11px] text-white leading-tight mt-0.5 truncate">{member.nick}</div>
                          </div>
                        </div>
                        {/* Back Card */}
                        <div className="absolute inset-0 border border-gray-400 rounded bg-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center gap-1">
                          <button onClick={() => setMembers(prev => prev.map(m => m.nick === member.nick ? { ...m, selected: true } : m))} className="px-1.5 py-0.5 bg-green-500 text-white text-[10px] rounded hover:bg-green-600">패스</button>
                          <button onClick={() => setMembers(prev => prev.filter(m => m.nick !== member.nick))} className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded hover:bg-red-600">취소</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom: Selected Members */}
            <div className="h-1/2 overflow-y-auto p-4 bg-gray-800 bg-opacity-30 flex items-center">
              <div className="flex flex-row gap-4">
                {members
                  .filter(member => member.selected)
                  .sort((a, b) => {
                    // ▼▼▼ [수정됨] as const 추가 (옵션이지만 타입 안정성 향상) ▼▼▼
                    const order = { '탱커': 0, '딜러': 1, '힐러': 2 } as const;
                    // ▲▲▲ 추가 ▲▲▲
                    return order[a.role] - order[b.role];
                   })
                  .map((member, index) => {
                    const classImage = wowClasses.find(c => c.class === member.class)?.image;
                    return (
                      <div key={`${member.nick}-selected-${index}`} className="group h-16 w-[100px] [perspective:1000px] flex-shrink-0">
                        <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                          {/* Front Card */}
                          <div
                            className="absolute inset-0 border border-gray-500 p-2 rounded-lg bg-gray-800 bg-opacity-80 [backface-visibility:hidden] flex items-center justify-end"
                            style={{
                              backgroundImage: classImage ? `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${classImage})` : 'none',
                              backgroundSize: 'contain', backgroundPosition: 'left center', backgroundRepeat: 'no-repeat'
                            }}>
                            <div className="text-right overflow-hidden whitespace-nowrap">
                              <span className="text-xs text-gray-300">{member.role}</span>
                              <span className="text-xs text-gray-300 mx-1">|</span>
                              <span className="text-xs text-gray-400 truncate">{member.job}</span>
                              <div className="font-semibold text-sm text-white mt-0.5 truncate">{member.nick}</div>
                            </div>
                          </div>
                          {/* Back Card */}
                          <div className="absolute inset-0 border border-gray-400 p-2 rounded-lg bg-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center">
                            <button onClick={() => setMembers(prev => prev.filter(m => m.nick !== member.nick))} className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors font-semibold">삭제</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div> {/* Left Area End */}

          {/* Right Area (Controls) */}
          <div className="w-[300px] h-[800px] p-4 overflow-y-auto bg-gray-900 bg-opacity-50 flex flex-col">
            {/* How to Apply */}
            <div className="mb-4">
              <h3 className="font-bold text-lg mb-2 text-white">신청 방법</h3>
              <p className="text-xs text-gray-300 mb-3">채팅에 자신의 특성을 입력해주세요</p>
            </div>

            {/* Class/Spec List */}
            <div className="space-y-2 mb-4 grid grid-cols-2 gap-2 flex-shrink-0">
              {wowClasses.map((wowClass) => (
                <div key={wowClass.class} className="hover:bg-gray-800 p-1 rounded">
                  <div className="flex items-center gap-1.5">
                    <img src={wowClass.image} alt={wowClass.class} className="w-5 h-5 rounded-md flex-shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {wowClass.jobs.map((job) => (
                        <span key={job.specificity} className="text-[10px] px-1 py-0.5 rounded border" style={{ borderColor: wowClass.color, color: wowClass.color }}>
                          {job.specificity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* How to Cancel */}
            <div className="mb-4 border-t border-gray-700 pt-3 flex-shrink-0">
              <h3 className="font-bold text-lg mb-2 text-white">취소 방법</h3>
              <p className="text-xs text-gray-300 mb-3">채팅에 <span className="text-white font-bold px-1.5 py-0.5 bg-red-900 bg-opacity-30 rounded">취소</span>를 입력해주세요</p>
            </div>

            {/* Spacer */}
            <div className="flex-grow"></div>

            {/* Random Selection */}
            <div className="mb-4 border-t border-gray-700 pt-3 flex-shrink-0">
              <h3 className="font-bold text-lg mb-3 text-white">랜덤 선택</h3>
              {/* Role Checkboxes */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-white bg-gray-700 px-2 py-1.5 rounded-md hover:bg-sky-700 justify-center">
                  <input type="checkbox" className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-sky-500 focus:ring-sky-500" checked={roleFilter.tank} onChange={() => setRoleFilter(prev => ({ ...prev, tank: !prev.tank }))}/>
                  <span>탱커</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-white bg-gray-700 px-2 py-1.5 rounded-md hover:bg-rose-700 justify-center">
                  <input type="checkbox" className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-rose-500 focus:ring-rose-500" checked={roleFilter.dealer} onChange={() => setRoleFilter(prev => ({ ...prev, dealer: !prev.dealer }))}/>
                  <span>딜러</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-white bg-gray-700 px-2 py-1.5 rounded-md hover:bg-emerald-700 justify-center">
                  <input type="checkbox" className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-emerald-500 focus:ring-emerald-500" checked={roleFilter.healer} onChange={() => setRoleFilter(prev => ({ ...prev, healer: !prev.healer }))}/>
                  <span>힐러</span>
                </label>
              </div>
              {/* Random Button */}
              <div className="grid grid-cols-1 gap-2">
                <button onClick={handleRandomAll} disabled={isRolling} className="px-2 py-2 bg-gray-700 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold whitespace-nowrap">
                  🎲 랜덤
                </button>
              </div>
            </div>

            {/* Close Button */}
            <div className="border-t border-gray-700 pt-3 flex-shrink-0">
              <button onClick={() => { setMembers([]); setSelectedMember(null); setIsShow(false); }} className="w-full px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold">
                🚫 종료
              </button>
            </div>
          </div> {/* Right Area End */}
        </div> // isShow wrapper div End
      )} {/* isShow End */}
    </>
  ); // return End
} // App Function End

export default App;
