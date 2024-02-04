(module
 (import "js" "memory" (memory 1))
 (func $foo (param $n i32) (local $i i32) (local $j i32)
  ;; c n ne e se s sw w nw c_ n_ ne_ e_ se_ s_ sw_ w_ nw_ c__ n__ ne__ e__ se__ s__ sw__ w__ nw__ 
  (local $c i32)
  (local $n i32)
  (local $ne i32)
  (local $e i32)
  (local $se i32)
  (local $s i32)
  (local $sw i32)
  (local $w i32)
  (local $nw i32)

  i32.const 0
  local.set $i
  i32.const 0
  local.set $j

  loop
    ;; inc
    i32.const 1
    local.get $i
    i32.add
    local.set $i

    loop
      ;; inc
      i32.const 1
      local.get $i
      i32.add
      local.set $i

      
      ;; test
      local.get $n
      local.get $i
      i32.sub
      br_if 0
    end
    ;; test
    local.get $n
    local.get $i
    i32.sub
    br_if 0
  end
  local.get $i
 )
 (export "foo" (func $foo))
)
