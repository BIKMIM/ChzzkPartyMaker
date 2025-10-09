## License

- This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## 라이선스

- 이 프로젝트는 AGPL-3.0 License - [LICENSE](LICENSE) 를 따릅니다.

## 사용 방법

- OBS 에서 소스 목록 - 브라우저 URL 에 아래 주소를 입력합니다.
- https://minisv.github.io/ChzzkPartyMaker/?chzzk=
- 위의 주소 chzzk= 뒤 부분에 여러분의 방송 chatChannelID 를 입력 합니다.
- 파티를 모집할때 채팅창에 일반시청자가 아닌 아이디로 파티 라고 입력 합니다. (채팅 매니저도 사용 가능합니다.)

## chatChannelID 알아오는 방법

- 예를 들어, https://chzzk.naver.com/769788af1e0d5fc7caeeb025504e62d8 채널주소가 이와 같다면? 76으로 시작하는 긴 값이 여러분의 채널 아이디 값이 됩니다.
- https://api.chzzk.naver.com/polling/v2/channels/(여러분의채널아이디값)/live-status 로 접속하면 chatChannelID 뒤의 값이 나옵니다. 여러분의 채널 아이디 값을 대입하여 확인해 주세요.
- 해당 값을 사용 방법에서 안내한 주소 처럼 ?chzzk=chatChannelID 로 셋팅 하면 됩니다.

## 주의 사항

- 19금 방송이 체크된 경우 chatChannelID 를 정확히 알아낸다 하더라도 이용할 수 없습니다.
- 이 프로그램은 chzzk 채팅 채널에 읽기 전용 으로 채팅을 읽는 방법을 사용하고 있습니다.