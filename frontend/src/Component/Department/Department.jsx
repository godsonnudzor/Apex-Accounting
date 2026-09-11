import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiUrl } from "../../context/auth";


const Department = () => {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(getApiUrl("/api/departments"), { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load departments");
        return result.departments || [];
      })
      .then(setDepartments)
      .catch((loadError) => setError(loadError.message));
  }, []);

  const filteredDepartments = departments.filter((department) =>
    department.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className='p-5'>
      <div className='text-center'>
        <h3 className='text-2xl font-bold'>Manage Departments</h3>
      </div>
      <div className='flex justify-between items-center p-4'>
        <input type="text" placeholder="Search by department name" value={search} onChange={(event) => setSearch(event.target.value)} className='px-4 py-0.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500' />
        <Link to="/department/add" className='px-4 py-1 bg-teal-500 text-white rounded hover:bg-teal-600'>Add New Department</Link>

      </div>
      {error ? <p className="px-4 text-red-600" role="alert">{error}</p> : null}
      <div className="px-4">
        {filteredDepartments.length ? filteredDepartments.map((department) => (
          <article key={department.id} className="border-b border-gray-200 py-4">
            <h4 className="font-semibold">{department.name}</h4>
            {department.description ? <p className="text-gray-600">{department.description}</p> : null}
          </article>
        )) : <p className="text-gray-600">No departments found.</p>}
      </div>
    </div>
  )
}

export default Department