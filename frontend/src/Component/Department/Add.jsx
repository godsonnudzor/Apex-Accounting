import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiUrl } from "../../context/auth";

const Add = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const response = await fetch(getApiUrl("/api/departments"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to add department");
      navigate("/department");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='max-w-3xl mx-auto mt-10 bg-white p-8 rounded-md shadow-md w-96'>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className='text-2xl font-bold'>Add New Department</h3>
          <Link to="/department" className="text-sm text-teal-600 hover:underline">Back</Link>
        </div>
        <form onSubmit={handleSubmit}>
          <div >
            <label htmlFor="dep_name"
              className='text-sm font-medium text-gray-700 '>
              Department Name
            </label>
            <input type="text" 
            name="dep_name" 
            placeholder="Enter dept name" 
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={100}
            className='mt-1 w-full p-2 border border-gray-300 rounded-md' />
          </div>
          <div className=' mt-3'>
            <label htmlFor="description"
              className='text-sm font-medium text-gray-700 mb-1 block'>
              Description
            </label>
            <textarea 
              name="description"
              placeholder="Enter description"
              rows ={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              className='block mt-1 p-2 w-full border border-gray-300 rounded-md' />
          </div>
          {error ? <p className="mt-3 text-sm text-red-600" role="alert">{error}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className='px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 mt-4 disabled:opacity-50'>
            {saving ? "Saving..." : "Add Department"}
          </button>
        </form>   
      </div> 
    </div>
  )
}

export default Add  
