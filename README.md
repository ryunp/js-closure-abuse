# js-closure-abuse
#### An exploration into closures, execution scope, context, and Object.bind()



The code inside the for loop really tripped me up:

    Synth.prototype.sequence = function(queue, bpm, loops){

      // Get BPM delay in milliseconds
      var calculated_bpm = this.calculateBpm(bpm);

      // Play each sound, then wait for the offset
      for(i=0; i < queue.length; i++){
        ((function(offset){
          setTimeout((function(){
            this.play(queue[offset]);
          }).bind(this), offset * calculated_bpm)
        }).bind(this))(i);
      }
    };

Source: [Synth.js](https://github.com/garvank/synth-js)


Looks like Lisp has been sleeping around with this code. So I began investigating. I ended up simplifying down to:

    for(i=0; i < queue.length; i++)
       setTimeout( this.show.bind(this, el, queue[i]), delay * i );

[js/main.js](js/main.js) has the investigation diary (thought process) located after code.  
But you are lazy, like me. So here is a breakdown with pictures and stuff.

### Breakdown
Screenshots of the data from Dev Tools panel are linked for visuals/reference.

1. Method Calls Stack is the [three method invocations](js/main.js#L66-L68).  
2. Callback Stack is invocation of their respective callbacks.


####[run_original()](js/main.js#L19-L30)
#####[Method Calls Stack](img/method_invocation_callstacks.jpg)
    (anonymous function)  @ main.js:25 // setTimeout((function(){ this.show... }).bind(this), offset * delay);
    Test.run_original     @ main.js:28 // ((function(offset){ setTimeout... }).bind(this))(i);
    (anonymous function)  @ main.js:66 // t.run_original( ... );
#####[run_original's Callback Stack](img/run_original_calllbackstack.jpg)
    0.1ms 65.07% insertAdjacentHTML    @ main.js:14 // el.insertAdjacentHTML("beforeend", html);
    0.2ms 100.0% Test.show             @ main.js:14 // el.insertAdjacentHTML("beforeend", html);
    0.2ms 100.0% (anonymous function)  @ main.js:26 // this.show(el, queue[offset]);

As you can see, two extra closures are created and held in memory.

1. Wrapping the setTimeout function (top of *Method Calls Stack*) which is created and called immediately (bound IIFE).
2. Created in the setTimeout argument (bottom of *Callback Stack*) (bound functor)

####[run_meh()](js/main.js#L34-L43)
#####[Method Calls Stack](img/method_invocation_callstacks.jpg)
    Test.run_meh         @ main.js:39 // setTimeout((function(item) { this.show... }).bind(this, queue[i]), delay * i);
    (anonymous function) @ main.js:67 // t.run_meh( ... );
#####[run_meh's Callback Stack](img/run_meh_callbackstack.jpg)
    0.0ms 21.04% insertAdjacentHTML    @ main.js:14 // el.insertAdjacentHTML("beforeend", html);
    0.2ms 100.0% Test.show             @ main.js:11 // Test.prototype.show = function(el, data){
    0.2ms 100.0% (anonymous function)  @ main.js:39 // setTimeout((function(item) {

The wrapping closure in the *Method Calls Stack* is removed. But we still have the wrapping closure in the setTimeout argument (bottom of *Callback Stack*).

####[run_cranked()](js/main.js#L47-L53)
#####[Method Calls Stack](img/method_invocation_callstacks.jpg)
    Test.run_cranked      @ main.js:52 // setTimeout((function(item) { ... }).bind(this, queue[i]), delay * i);
    (anonymous function)  @ main.js:68 // t.run_cranked( ... );
#####[run_cranked's Callback Stack](img/run_cranked_callbackstack.jpg)
    0.1ms 33.00% insertAdjacentHTML  @ main.js:14 // el.insertAdjacentHTML("beforeend", html);
    0.2ms 100.0% Test.show           @ main.js:11 // Test.prototype.show = function(el, data){

This is beautiful. There is no closure wrappers around anything. Just a single functor returned from bind() set as the callback in setTimeout. Context, and arguments are preserved inside the functor's scope, all packaged up, waiting to be called. Sexy. As. F*#@.

####Conclusion
The time taken to create and execute a bound function is fractions of a millisecond. There is no noticable difference on this scale, but large applications misusing closures can add up.  
Closures must be saved in memory, so reducing usage cuts down on time and memory.

#####Method Calls Stack
[Method Calls Stack](img/method_invocation_callstacks.jpg) shows performance hits for setting up the setTimeouts:

| Function | % Time Total |
| --- | --- |
| original | 9.2% |
| meh | 8.5% |
| cranked | 2.6% |

Granted these are against incredibly small quantities, *cranked* still manages a third less time without extra closures.

#####Callback Stack
The callback stacks are less interesting in relation to time, since functions are just being call and not created. Still good to consider the extra wasted cycles on the calls.

####Working Demonstration
Because, you know, science: [JSFiddle](https://jsfiddle.net/ryunp/8nyq969t/)

####**Save time and memory! Stop closures abuse!**
