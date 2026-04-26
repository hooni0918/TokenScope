// 이벤트 정의
abstract class CounterEvent {}
class Increment extends CounterEvent {}

// 상태 정의
class CounterState {
  final int count;
  CounterState(this.count);
}

// Bloc — 이벤트 받아서 새 상태 만들어냄
class CounterBloc extends Bloc<CounterEvent, CounterState> {
  CounterBloc() : super(CounterState(0)) {
    on<Increment>((event, emit) {
      emit(CounterState(state.count + 1));
    });
  }
}

// 위젯에서 사용
BlocBuilder<CounterBloc, CounterState>(
  builder: (context, state) => Text('${state.count}'),
);