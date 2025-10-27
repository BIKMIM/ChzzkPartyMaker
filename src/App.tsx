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

interface ChzzkMessageBody {
  profile: string
  extras: string
  msg: string
  msgTime: number
}

interface ChzzkProfile {
  userRoleCode: string
  nickname: string
}

interface ChzzkData {
  cmd: number
  bdy?: ChzzkMessageBody[]
}

interface Member {
  class: string
  nick: string
  role: string
  job: string
  selected: boolean
}

interface WoWClasses {
  class: string
  image: string
  color: string
  jobs: WoWJobs[]
}

interface WoWJobs {
  specificity: string
  role: string
}

interface MatchedWoWData {
  class: string
  image: string
  color: string
  specificity: string
  role: string
}

function App() {
  const [members, setMembers] = useState<Member[]>([])
  const [isShow, setIsShow] = useState<boolean>(false)
  const [isRolling, setIsRolling] = useState(false)
  const [selectedMember, setSelectedMember] = useState<typeof members[0] | null>(null)

// ▼▼▼ 역할 필터 체크박스 상태 (이것을 추가하세요) ▼▼▼
  const [roleFilter, setRoleFilter] = useState({
    tank: true,
    healer: true,
    dealer: true,
  });
  // ▲▲▲ 여기까지 추가 ▲▲▲


  const socketRef = useRef<WebSocket | null>(null)
  const isManualCloseRef = useRef(false)
  const wowClasses: WoWClasses[] = [
    {
      class: '전사', image: wowWarrior, color: '#C79C6E',
      jobs: [ { specificity: '무기', role: '딜러' }, { specificity: '분노', role: '딜러' }, { specificity: '방어', role: '탱커' } ]
    },
    {
      class: '성기사', image: wowPaladin, color: '#F58CBA',
      jobs: [ { specificity: '보호', role: '탱커' }, { specificity: '징벌', role: '딜러' }, { specificity: '신기', role: '힐러' } ]
    },
    {
      class: '죽음의기사', image: wowDeathKnight, color: '#C41F3B',
      jobs: [ { specificity: '혈기', role: '탱커' }, { specificity: '냉죽', role: '딜러' }, { specificity: '부정', role: '딜러' } ]
    },
    {
      class: '주술사', image: wowShaman, color: '#0070DE',
      jobs: [ { specificity: '정기', role: '딜러' }, { specificity: '고양', role: '딜러' }, { specificity: '복원', role: '힐러' } ]
    },
    {
      class: '사냥꾼', image: wowHunter, color: '#ABD473',
      jobs: [ { specificity: '야수', role: '딜러' }, { specificity: '사격', role: '딜러' }, { specificity: '생존', role: '딜러' } ]
    },
    {
      class: '도적', image: wowRogue, color: '#FFF569',
      jobs: [ { specificity: '암살', role: '딜러' }, { specificity: '무법', role: '딜러' }, { specificity: '잠행', role: '딜러' } ]
    },
    {
      class: '기원사', image: wowEvoker, color: '#33937F',
      jobs: [ { specificity: '황폐', role: '딜러' }, { specificity: '보존', role: '힐러' }, { specificity: '증강', role: '딜러' } ]
    },
    {
      class: '악마사냥꾼', image: wowDemonHunter, color: '#A330C9',
      jobs: [ { specificity: '복수', role: '탱커' }, { specificity: '파멸', role: '딜러' } ]
    },
    {
      class: '수도사', image: wowMonk, color: '#00FF96',
      jobs: [ { specificity: '양조', role: '탱커' }, { specificity: '풍운', role: '딜러' }, { specificity: '운무', role: '힐러' } ]
    },
    {
      class: '마법사', image: wowMage, color: '#69CCF0',
      jobs: [ { specificity: '냉법', role: '딜러' }, { specificity: '화염', role: '딜러' }, { specificity: '비전', role: '딜러' } ]
    },
    {
      class: '흑마법사', image: wowWarlock, color: '#9482C9',
      jobs: [ { specificity: '악마', role: '딜러' }, { specificity: '파괴', role: '딜러' }, { specificity: '고통', role: '딜러' } ]
    },
    {
      class: '사제', image: wowPriest, color: '#FFFFFF',
      jobs: [ { specificity: '수양', role: '힐러' }, { specificity: '신사', role: '힐러' }, { specificity: '암흑', role: '딜러' } ]
    },
    {
      class: '드루이드', image: wowDruid, color: '#FF7D0A',
      jobs: [ { specificity: '조화', role: '딜러' }, { specificity: '야성', role: '딜러' }, { specificity: '수호', role: '탱커' }, { specificity: '회복', role: '힐러' } ]
    }
  ]

  const findWoWClassBySpecificity = (msg: string): MatchedWoWData | null => {
    const searchTerm = msg.toLowerCase()

    for (const classData of wowClasses) {
      const matchedJob = classData.jobs.find(job => job.specificity === searchTerm)
      if (matchedJob) return {
        class: classData.class,
        image: classData.image,
        color: classData.color,
        specificity: matchedJob.specificity,
        role: matchedJob.role
      }
    }
    return null
  }

  const checkMessage = (role: string, nick: string, msg: string)=> {
    if (role === 'streamer' && msg === '파티') setIsShow(true)
    if (msg === '취소') {
      setMembers((prev) =>
        prev.filter((m) => !(m.nick === nick && !m.selected))
      )
      return
    }
    const matchedData = findWoWClassBySpecificity(msg)
    if (matchedData) {
      setMembers((prev) => {
        const existingIndex = prev.findIndex(member => member.nick === nick)
        if (existingIndex === -1) {
          return [...prev, {
            nick: nick,
            class: matchedData.class,
            role: matchedData.role,
            job: matchedData.specificity,
            selected: false
          }]
        }
        if (!prev[existingIndex].selected) {
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            nick: nick,
            class: matchedData.class,
            role: matchedData.role,
            job: matchedData.specificity
          }
          return updated
        }
        return prev
      })
    }
  }

  const connectWebSocket = () => {
    const ssID = Math.floor(Math.random() * 10) + 1
    const serverUrl = `wss://kr-ss${ssID}.chat.naver.com/chat`

    const socket = new WebSocket(serverUrl)
    socketRef.current = socket

    socket.addEventListener('open', () => {
      const params = new URLSearchParams(window.location.search)
      const chatChannelID = params.get('chzzk')
      if (!chatChannelID) return
      const option = {
        ver: '2',
        cmd: 100,
        svcid: 'game',
        cid: chatChannelID,
        bdy: { devType: 2001, auth: 'READ' },
        tid: 1
      }
      socket.send(JSON.stringify(option))
    })

    socket.addEventListener('message', (event) => {
      const data: ChzzkData = JSON.parse(event.data)

      if (data.bdy && Symbol.iterator in Object(data.bdy)) {
        for (const body of data.bdy) {
          const profile: ChzzkProfile = JSON.parse(body.profile)
          checkMessage(profile.userRoleCode, profile.nickname, body.msg)
        }
      }
      if (data.cmd === 0) socket.send(JSON.stringify({ ver: '2', cmd: 10000 }))
      if (data.cmd === 10100) socket.send(JSON.stringify({ ver: '2', cmd: 0 }))
    })

    socket.addEventListener('close', () => {
      if (!isManualCloseRef.current) connectWebSocket()
    })

    socket.addEventListener('error', (error) => {
      console.error('WebSocket 오류:', error)
    })
  }

  const rollupAnimation = (targetMembers: typeof members) => {
    if (targetMembers.length === 0) {
      toast('선택 가능한 멤버가 없습니다')
      return
    }
    setIsRolling(true)
    let counter = 0
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * targetMembers.length)
      setSelectedMember(targetMembers[randomIndex])
      counter++

      if (counter > 20) {
        clearInterval(interval)
        const finalIndex = Math.floor(Math.random() * targetMembers.length)
        const selected = targetMembers[finalIndex]
        setSelectedMember(selected)
        setTimeout(() => {
          setMembers((prev) =>
            prev.map((m) =>
              m.nick === selected.nick ? { ...m, selected: true } : m
            )
          )
          setIsRolling(false)
          setSelectedMember(null)
        }, 1000)
      }
    }, 100)
  }

const handleRandomAll = () => {
    // 1. 현재 파티(이미 선택된 멤버)에 누가 있는지 확인합니다.
    const selectedParty = members.filter(m => m.selected);
    const hasTank = selectedParty.some(m => m.role === '탱커');
    const hasHealer = selectedParty.some(m => m.role === '힐러');

    // 2. 아직 선택되지 않은 대기열 멤버를 가져옵니다.
    const available = members.filter(m => !m.selected);

    // 3. [요청사항 수정] 대기열 멤버들을 필터링합니다.
    //    - 이미 뽑힌 역할군(탱/힐)은 체크박스 상태와 관계없이 제외합니다.
    //    - 그 외에는 체크된 역할군만 대상으로 합니다.
    const targetMembers = available.filter(m => {
      // 조건 1: 이미 파티에 탱커가 있다면, 현재 멤버가 탱커면 무조건 제외 (false)
      if (hasTank && m.role === '탱커') return false;
      // 조건 2: 이미 파티에 힐러가 있다면, 현재 멤버가 힐러면 무조건 제외 (false)
      if (hasHealer && m.role === '힐러') return false;

      // 조건 3: 위에서 제외되지 않았다면, 체크박스 상태를 따릅니다.
      if (roleFilter.tank && m.role === '탱커') return true;
      if (roleFilter.healer && m.role === '힐러') return true;
      if (roleFilter.dealer && m.role === '딜러') return true;

      // 위 모든 조건에 해당하지 않으면 제외 (false)
      return false;
    });

    // 4. 필터링 후 대상이 없으면 알림
    //    - 이전에 있던 "최소 탱/힐 1명" 검사는 삭제되었습니다.
    if (targetMembers.length === 0) {
       // 어떤 이유로 대상이 없는지 조금 더 상세하게 알려줍니다.
       const availableFilteredByCheckboxOnly = available.filter(m => {
            if (roleFilter.tank && m.role === '탱커') return true;
            if (roleFilter.healer && m.role === '힐러') return true;
            if (roleFilter.dealer && m.role === '딜러') return true;
            return false;
       });
       if(availableFilteredByCheckboxOnly.length === 0){
           toast.warn('선택한 역할의 대기 멤버가 없습니다!');
       } else {
           toast.warn('현재 파티 구성에 맞는 역할의 대기 멤버가 없습니다!');
       }
       return;
    }

    // 5. 최종 필터링된 멤버들로 롤업 애니메이션 실행
    rollupAnimation(targetMembers);
  }


  

  useEffect(() => {
    connectWebSocket()
    const handleBeforeUnload = () => {
      isManualCloseRef.current = true
      socketRef.current?.close()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      isManualCloseRef.current = true
      socketRef.current?.close()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      {isShow && (
        <div className="w-[950px] h-[800px] bg-black bg-opacity-80 border border-gray-600 flex rounded-2xl overflow-hidden shadow-2xl">
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

          {/* 왼쪽: 대기 멤버 - 200px 유지 */}
          <div className="w-[150px] h-[800px] border-r border-gray-700 overflow-y-auto p-2 bg-gray-900 bg-opacity-50">
            {[...members].reverse().filter(member => !member.selected).map((member, index) => {
              const classImage = wowClasses.find(c => c.class === member.class)?.image
              return (
                <div
                  key={index}
                  className="group h-16 w-full mb-2 [perspective:1000px]"
                >
                  <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                    <div
                      className="absolute inset-0 border border-gray-500 p-2 rounded-lg bg-gray-800 bg-opacity-80 [backface-visibility:hidden] flex items-center justify-end"
                      style={{
                        backgroundImage: classImage ? `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${classImage})` : 'none',
                        backgroundSize: 'contain',
                        backgroundPosition: 'left center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      <div className="text-right">
                        <span className="text-xs text-gray-300">{member.role}</span>
                        <span className="text-xs text-gray-300 mx-1">|</span>
                        <span className="text-xs text-gray-400">{member.job}</span>
                        <div className="font-semibold text-sm text-white mt-0.5">{member.nick}</div>
                      </div>
                    </div>
                    <div className="absolute inset-0 border border-gray-400 p-2 rounded-lg bg-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setMembers((prev) =>
                            prev.map((m) =>
                              m.nick === member.nick ? { ...m, selected: true } : m
                            )
                          )
                        }}
                        className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                      >
                        패스
                      </button>
                      <button
                        onClick={() => {
                          setMembers((prev) =>
                            prev.filter((m) => m.nick !== member.nick)
                          )
                        }}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 중간: 선택된 멤버 - 600px 유지 */}
          <div className="w-[500px] h-[800px] border-r border-gray-700 grid grid-cols-3 gap-4 p-4 overflow-y-auto bg-gray-800 bg-opacity-30">
            {members
              .filter(member => member.selected)  
              .sort((a, b) => {
                const roleOrder: Record<string, number> = { '탱커': 0, '딜러': 1, '힐러': 2 };
                return roleOrder[a.role] - roleOrder[b.role]
              })
              .map((member, index) => {
                const classImage = wowClasses.find(c => c.class === member.class)?.image
                return (
                  <div
                    key={index}
                    className="group h-16 [perspective:1000px]"
                  >
                    <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                      <div
                        className="absolute inset-0 border border-gray-500 p-2 rounded-lg bg-gray-800 bg-opacity-80 [backface-visibility:hidden] flex items-center justify-end"
                        style={{
                          backgroundImage: classImage ? `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${classImage})` : 'none',
                          backgroundSize: 'contain',
                          backgroundPosition: 'left center',
                          backgroundRepeat: 'no-repeat'
                        }}
                      >
                        <div className="text-right">
                          <span className="text-xs text-gray-300">{member.role}</span>
                          <span className="text-xs text-gray-300 mx-1">|</span>
                          <span className="text-xs text-gray-400">{member.job}</span>
                          <div className="font-semibold text-sm text-white mt-0.5">{member.nick}</div>
                        </div>
                      </div>
                      <div className="absolute inset-0 border border-gray-400 p-2 rounded-lg bg-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center">
                        <button
                          onClick={() => {
                            setMembers((prev) =>
                              prev.filter((m) => m.nick !== member.nick)
                            )
                          }}
                          className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors font-semibold"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>

          {/* 오른쪽: 안내 및 버튼 - 200px → 400px */}
          <div className="w-[300px] h-[800px] p-4 overflow-y-auto bg-gray-900 bg-opacity-50">
            <div className="mb-4">
              <h3 className="font-bold text-lg mb-2 text-white">신청 방법</h3>
              <p className="text-xs text-gray-300 mb-3">
                채팅에 자신의 특성을 입력해주세요
              </p>
            </div>

            {/* 클래스 목록 - 높이 절반으로 축소 */}
            <div className="space-y-2 mb-4 grid grid-cols-2 gap-2">
              {wowClasses.map((wowClass) => (
                <div
                  key={wowClass.class}
                  className="cursor-pointer hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <img
                      src={wowClass.image}
                      alt={wowClass.class}
                      className="w-6 h-6 rounded-md flex-shrink-0"
                    />
                    {wowClass.jobs.map((job) => (
                      <span
                        key={job.specificity}
                        className="text-xs px-1.5 py-0.5 rounded border"
                        style={{
                          borderColor: wowClass.color,
                          color: wowClass.color
                        }}
                      >
                        {job.specificity}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4 border-t border-gray-700 pt-3">
              <h3 className="font-bold text-lg mb-2 text-white">취소 방법</h3>
              <p className="text-xs text-gray-300 mb-3">
                채팅에 <span className="text-white font-bold px-1.5 py-0.5 bg-red-900 bg-opacity-30 rounded">취소</span>를 입력해주세요
              </p>
            </div>

            {/* 랜덤 선택 버튼 - 한 줄로 배치 */}
            <div className="mb-4 border-t border-gray-700 pt-3">
              <h3 className="font-bold text-lg mb-3 text-white">랜덤 선택</h3>
              {/* ▼▼▼ 역할군 체크박스 (바로 이 부분을 추가하라는 의미였습니다!) ▼▼▼ */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {/* 탱커 체크박스 */}
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-white bg-gray-700 px-2 py-1.5 rounded-md hover:bg-sky-700">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-sky-500 focus:ring-sky-500"
                    checked={roleFilter.tank}
                    onChange={() => setRoleFilter(prev => ({ ...prev, tank: !prev.tank }))}
                  />
                  <span>🛡️ 탱커</span>
                </label>
                {/* 딜러 체크박스 */}
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-white bg-gray-700 px-2 py-1.5 rounded-md hover:bg-rose-700">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-rose-500 focus:ring-rose-500"
                    checked={roleFilter.dealer}
                    onChange={() => setRoleFilter(prev => ({ ...prev, dealer: !prev.dealer }))}
                  />
                  <span>⚔️ 딜러</span>
                </label>
                {/* 힐러 체크박스 */}
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-white bg-gray-700 px-2 py-1.5 rounded-md hover:bg-emerald-700">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-emerald-500 focus:ring-emerald-500"
                    checked={roleFilter.healer}
                    onChange={() => setRoleFilter(prev => ({ ...prev, healer: !prev.healer }))}
                  />
                  <span>⚕️ 힐러</span>
                </label>
              </div>
              {/* ▲▲▲ 여기까지 추가 ▲▲▲ */}
              {/* ▼▼▼ "🎲 랜덤" 버튼이 여기 있어야 합니다! (이 div를 추가하세요) ▼▼▼ */}
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={handleRandomAll}
                  disabled={isRolling}
                  className="px-2 py-2 bg-gray-700 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold whitespace-nowrap"
                >
                  🎲 랜덤
                </button>
              </div>
              {/* ▲▲▲ 여기까지 추가 ▲▲▲ */}
              </div>
            {/* 닫기 버튼 */}
            <div className="border-t border-gray-700 pt-3">
              <button
                onClick={() => {
                  setMembers([])
                  setSelectedMember(null)
                  setIsShow(false)
                }}
                className="w-full px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold"
              >
                🚫 종료
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
