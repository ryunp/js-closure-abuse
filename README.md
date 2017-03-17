# js-closure-abuse
## An exploration into closures, execution scope, and Object.bind()

Dealing with object methods and timeouts can lead to major frustration when not properly understood. This [chunk of code](https://github.com/garvank/synth-js) looks incredibly complex and seemingly far beyond comprehension for us mere pleb coding mortals.

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

And so the delicous challenge is accepted. Here is what I came up with:

    for(i=0; i < queue.length; i++)
       setTimeout(this.show.bind(this, el, queue[i]), delay * i);

The desired behavoir is a sequence of delayed callbacks using another method from the object. That does not require multiple nested closures to accomplish, as you can see.

---

**Technical Review**

The breakdown below is split into multiple section. Each section has three sub-sections, a title and intro, setTimeout call stack review, and callback call stack review.

*Note: The stack log builds upwards, bottom line being first evaluated.*

### Original Code ([run_original()](js/main.js#L19-L30))

So let's take a look at the events that occur with the original code.

    Test.prototype.run_original = function(el, queue, ms){
    
      var delay = ms;    
    
      for (i=0; i < queue.length; i++) {
        ((function(offset){
          setTimeout((function(){
            this.show(el, queue[offset]);
          }).bind(this), offset * delay);
        }).bind(this))(i);
      }
    };

##### setTimeout Invocation Call Stack

    (anonymous function)  @ main.js:25 // setTimeout((function(){ this.show... }).bind(this), offset * delay);
    Test.run_original     @ main.js:28 // ((function(offset){ setTimeout... }).bind(this))(i);
    (anonymous function)  @ main.js:66 // t.run_original( ... );

*line 66* is invoked, which kicks off the for loop.  
*line 28* invokes the IIFE closure that contains the *setTimeout*.  
*line 25* runs inside the IIFE's context (anon func) and creates another functor for setTimeout.

Two user space closures are created for setTimeout. One is to save the context around setTimeout, and another saving context being passed to setTimeout. Seems a bit redundant.

##### Callback Invocation Call Stack ([Dev Tools Capture](img/run_original_calllbackstack.jpg))

When the callback given to setTimeout is executed:

    0.1ms 65.07% insertAdjacentHTML    @ main.js:14 // el.insertAdjacentHTML("beforeend", html);
    0.2ms 100.0% Test.show             @ main.js:14 // el.insertAdjacentHTML("beforeend", html);
    0.2ms 100.0% (anonymous function)  @ main.js:26 // this.show(el, queue[offset]);

*line 26* functor passed to setTimeout is executed
*line 14* Test.show() payload is executed

We can see the wrapping function for *this.show()* in action. There is a lot of redundancy here, let's try reducing these closures...

---

### Outer Closure Removal ([run_meh()](js/main.js#L34-L43))

We can first try to strip the closure wrapping setTimeout.

    Test.prototype.run_meh = function(el, queue, ms) {
    
      var delay = ms;
    
      for (i=0; i < queue.length; i++) {
        setTimeout((function(item) {
          this.show(el, item);
        }).bind(this, queue[i]), delay * i);
      }
    };

This ends up still working just fine, actually. No more alterations are needed!

##### setTimeout Invocation Call Stack

    Test.run_meh         @ main.js:39 // setTimeout((function(item) { this.show... }).bind(this, queue[i]), delay * i);
    (anonymous function) @ main.js:67 // t.run_meh( ... );

*line 67* is invoked, which kicks off the for loop.  
*line 39* Creates a functor for setTimeout.

Indeed it has been removed from the instructions. So far so good.

##### Callback Invocation Call Stack ([Dev Tools Capture](img/run_meh_callbackstack.jpg))

    0.0ms 21.04% insertAdjacentHTML    @ main.js:14 // el.insertAdjacentHTML("beforeend", html);
    0.2ms 100.0% Test.show             @ main.js:11 // Test.prototype.show = function(el, data){
    0.2ms 100.0% (anonymous function)  @ main.js:39 // setTimeout((function(item) {

*line 39* functor passed to setTimeout is executed
*line 11* Test.show() payload is executed

We still have the wrapping closure in the setTimeout argument. Let's see what we can do to this extra closure...

---

### Inner Closure Refactor ([run_cranked()](js/main.js#L47-L53))

Wrapping a function with another contextually bound function is literally what Object.bind() is meant for. So let's refactor that wrapper into a call to bind().

    Test.prototype.run_cranked = function(el, queue, ms) {
    
      var delay = ms;
    
      for (i=0; i < queue.length; i++)
        setTimeout( this.show.bind(this, el, queue[i]), delay * i );
    };

I want to think bind() is internally more efficient than an explicit function wrapper. But I'm not entirely sure, although it does look more declarative and easier to read.

##### setTimeout Invocation Call Stack

    Test.run_cranked      @ main.js:52 // setTimeout((function(item) { ... }).bind(this, queue[i]), delay * i);
    (anonymous function)  @ main.js:68 // t.run_cranked( ... );

*line 68* is invoked, which kicks off the for loop.  
*line 52* Creates a functor for setTimeout.

Same situation from before. No outer wrapping closure context seen. Moving on...

##### Callback Invocation Call Stack [Dev Tools Capture](img/run_cranked_callbackstack.jpg)

    0.1ms 33.00% insertAdjacentHTML  @ main.js:14 // el.insertAdjacentHTML("beforeend", html);
    0.2ms 100.0% Test.show           @ main.js:11 // Test.prototype.show = function(el, data){

*line 11* Test.show() payload is executed

Perfect! The anonymous function context is now gone! Just a call to show() with properly binded *this* context. Mmmm. Delish.

---

### Conclusion

The time taken to create and execute a bound function is fractions of a millisecond. There is no noticable difference on this scale, but large applications may see different results.

Be careful creating extra layers of abstraction; *time is money, friend*!

##### setTimeout Invocation Call Stack

[setTimeout Call Stack](img/method_invocation_call stacks.jpg) shows performance hits for setting up the setTimeouts:

| Function | % Time Total |
| --- | --- |
| original | 9.2% |
| meh | 8.5% |
| cranked | 2.6% |

Granted these are against incredibly small quantities, *cranked* still manages a third less time without extra closures.

##### Callback Invocation Call Stack

The callback stacks are less interesting in relation to time, since functions are just being called and not created. Still good to consider the extra wasted CPU time.

#### Working Demonstration

Because, you know, science: [JSFiddle](https://jsfiddle.net/ryunp/8nyq969t/) or [Github](http://ryunp.github.io/js-closure-abuse/)

#### #FriendsDontLetFriendsThatEqualsThis

This is long and riddled with mistakes, no doubt. Let me know if you spot one, many, or *rm -rf*.