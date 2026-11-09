do $$
declare
  v_function_definition text;
  v_original text := $original$round((item->>'amount')::numeric, 2)
        into v_allocation$original$;
  v_corrected text := $corrected$round((item->>'amount')::numeric, 2) as amount
        into v_allocation$corrected$;
begin
  select pg_get_functiondef(
    'public.create_document_settlement(character varying, bigint, date, character varying, character varying, bigint, text, jsonb, bigint)'::regprocedure
  )
    into v_function_definition;

  if position(v_original in v_function_definition) = 0 then
    raise exception 'Expected supplier-payment allocation expression was not found';
  end if;

  v_function_definition := replace(
    v_function_definition,
    v_original,
    v_corrected
  );
  execute v_function_definition;
end;
$$;
