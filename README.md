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


So I began investigating. I ended up simplifying down to:

    for(i=0; i < queue.length; i++)
       setTimeout( this.show.bind(this, el, queue[i]), delay * i );

[js/main.js](js/main.js) has the investigation diary (thought process) located after code.  
But you are lazy, like me. So here is a breakdown with pictures and stuff.

### Breakdown
Here is the three method invocations which set timeouts. Screenshots of the data from Dev Tools panel are linked for visuals/reference.

####run_original()
#####[Method Call Stack](img/method_invocation_callstacks.jpg)
    (anonymous function)  @ main.js:25 // setTimeout((function(){ }).bind(this), offset * delay);
    Test.run_original     @ main.js:28 // ((function(offset){ }).bind(this))(i);
    (anonymous function)  @ main.js:66 // t.run_original( ... );
#####[Callback Stack](img/run_original_calllbackstack.jpg)
    0.1ms 65.07% insertAdjacentHTML    @ main.js:14 // el.insertAdjacentHTML("beforeend", html);
    0.2ms 100.0% Test.show             @ main.js:14 // el.insertAdjacentHTML("beforeend", html);
    0.2ms 100.0% (anonymous function)  @ main.js:26 // this.show(el, queue[offset]);

As you can see, two extra closures are created and held in memory.  
First is in the method call wrapping the setTimeout function (top of method stack) which is created and called immediately (bound IIFE).  
Second is created in the setTimeout argument (bottom of callback stack). No bueno.  

####run_meh()
#####[Method Call Stack](img/method_invocation_callstacks.jpg)
    Test.run_meh         @ main.js:39 // setTimeout((function(item) { ... }).bind(this, queue[i]), delay * i);
    (anonymous function) @ main.js:67 // t.run_meh( ... );
#####[Callback Stack](img/run_meh_callbackstack.jpg)
    0.0ms 21.04% insertAdjacentHTML    @ main.js:14 // el.insertAdjacentHTML("beforeend", html);
    0.2ms 100.0% Test.show             @ main.js:11 // Test.prototype.show = function(el, data){
    0.2ms 100.0% (anonymous function)  @ main.js:39 // setTimeout((function(item) {

The wrapping closure in the method call is removed (main.js:25 is gone). But we still have the wrapping closure in the setTimeout argument (bottom of callback stack).

####run_cranked()
#####[Method Call Stack](img/method_invocation_callstacks.jpg)
    Test.run_cranked      @ main.js:52 // setTimeout((function(item) { ... }).bind(this, queue[i]), delay * i);
    (anonymous function)  @ main.js:68 // t.run_cranked( ... );
#####[Callback Stack](img/run_cranked_callbackstack.jpg)
    0.1ms 33.00% insertAdjacentHTML  @ main.js:14 // el.insertAdjacentHTML("beforeend", html);
    0.2ms 100.0% Test.show           @ main.js:11 // Test.prototype.show = function(el, data){

This is beautiful. There is no closure wrappers around anything. Just a single functor returned from bind() set as the callback in setTimeout. Context, and arguments are preserved inside the functor's scope, all packaged up, waiting to be called. Sexy. As. F*#@.

####Conclusion
The time taken to create and execute a bound function is fractions of a millisecond. There is no noticable difference on this scale, but large applications misusing closures can add up.  
Closures must be saved in memory, so reducing usage cuts down on time and memory.

#####Method Call Stack
While approximate, the [Method Invocation Stacks](img/method_invocation_callstacks.jpg) shows performance hits for setting up the setTimeouts:
function | method
---- | ----
original | 9.2%
meh | 8.2%
cranked | 2.6%

Granted these are against incredibly small quantities, *cranked* manages a third less time without extra closures.

#####Callback Stack
The callback stacks are less interesting in relation to time, since functions are just being call and not created.

####Working Demonstration
Because, you know, science: [JSFiddle](https://jsfiddle.net/ryunp/8nyq969t/)

####**Save time, and memory! Stop closures abuse!**